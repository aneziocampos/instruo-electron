---
status: pending
priority: p1
issue_id: "007"
tags: [code-review, performance, resilience]
---

## Problem Statement

macOS Accessibility API calls (`getElementAtPosition`, `getParentChain`, `getProcessName`) run synchronously on the main Electron thread via FFI. If the target application is unresponsive or slow to respond, these calls block indefinitely -- freezing the entire app (tray, hotkeys, IPC, UI, everything). CLAUDE.md documents that "UIA queries run on a worker thread with 1-second timeout" but this is NOT actually implemented.

## Findings

- `src/main/ax-client.ts` lines 26-59: All Accessibility API calls are synchronous FFI invocations on the main thread. There is no worker thread, no timeout, and no fallback.
- `src/main/capture-pipeline.ts` lines 40-45: The capture pipeline calls `ax-client` methods directly during the mousedown capture flow. Since screenshots are captured eagerly on mousedown, a blocking AX call holds up the entire capture pipeline.
- `native/src/lib.rs`: The native Rust module exposes synchronous functions. There is no async variant or timeout mechanism at the native level.
- A single unresponsive target app (common with heavy apps like Excel, Photoshop, or apps showing modal dialogs) can freeze Instruo for seconds or indefinitely.

## Proposed Solution

Move AX queries off the main thread with a timeout:

1. Create a worker thread module `src/main/ax-worker.ts` using Node.js `worker_threads`:

```typescript
// ax-worker.ts (runs in worker thread)
import { parentPort } from 'worker_threads';
import { axClient } from './ax-client';

parentPort?.on('message', (msg) => {
  try {
    const result = axClient[msg.method](...msg.args);
    parentPort?.postMessage({ id: msg.id, result });
  } catch (err) {
    parentPort?.postMessage({ id: msg.id, error: String(err) });
  }
});
```

2. Create `src/main/ax-client-async.ts` that wraps the worker with `Promise.race()`:

```typescript
async function queryWithTimeout<T>(
  method: string,
  args: unknown[],
  timeoutMs = 1000
): Promise<T | null> {
  return Promise.race([
    postToWorker<T>(method, args),
    new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs)
    ),
  ]);
}
```

3. Update `src/main/capture-pipeline.ts` to use the async wrapper. If the timeout fires, return a fallback `ClickContext` with null element info (the screenshot is already captured, so the step is still useful -- it just lacks AX metadata).

4. Add logging when timeouts occur so we can track which apps cause issues.

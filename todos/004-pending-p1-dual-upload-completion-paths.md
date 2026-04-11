---
status: pending
priority: p1
issue_id: "004"
tags: [code-review, race-condition, architecture]
---

## Problem Statement

Upload has two completion paths: the `invoke` return value (`Result<GuideResponse>`) AND separate `upload:complete`/`upload:error` IPC events. Both fire, causing double state transitions. If error handling is added to the invoke path, it will conflict with the event-based error handler, leading to unpredictable UI state.

## Findings

- `src/renderer/src/App.tsx` lines 55-67: The upload is initiated via `window.api.invoke('guide:upload-all', ...)` which returns a `Result<GuideResponse>`. The `.then()` handler processes the result.
- `src/renderer/src/App.tsx` lines 111-120: Separate useEffect listeners subscribe to `upload:complete` and `upload:error` IPC events, which also trigger state transitions.
- `src/main/ipc-handlers.ts` lines 88-112: The handler both returns a result AND emits IPC events for completion/error, creating the dual-path issue.
- Both paths attempt to update the same UI state, resulting in double transitions. Adding proper error handling to one path will inevitably race with the other.

## Proposed Solution

Pick one completion path and remove the other. Since upload progress events already use IPC events (`upload:progress`), the event-driven approach is the more natural fit:

**Option A (recommended): Keep events, make invoke fire-and-forget**
1. In `src/main/ipc-handlers.ts`, change the `guide:upload-all` handler to return `void` (or a simple `Result<void>` acknowledging the upload started). Keep emitting `upload:complete`, `upload:error`, and `upload:progress` events.
2. In `src/renderer/src/App.tsx`, remove the `.then()` handler on the invoke call. Rely solely on the event listeners for completion/error state transitions.

**Option B: Keep invoke, remove events**
1. Remove `upload:complete` and `upload:error` event emissions from the handler.
2. Remove the event listener useEffects from App.tsx.
3. Handle everything in the invoke `.then()` / `.catch()` chain.
4. For progress, switch to returning a stream or using a polling approach.

Option A is simpler since progress already uses events.

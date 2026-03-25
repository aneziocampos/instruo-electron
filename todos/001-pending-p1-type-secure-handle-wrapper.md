---
status: complete
priority: p1
issue_id: "001"
tags: [code-review, typescript, ipc]
dependencies: []
---

# Type the secureHandle wrapper generically

## Problem Statement

`secureHandle()` in `ipc-handlers.ts` accepts `channel: string` and `handler: (...args: unknown[]) => unknown`, erasing the entire typed IPC contract. The bidirectional IPC types defined in `ipc-channels.ts` are not enforced on the main process side, allowing silent return type mismatches.

## Findings

- **Source:** TypeScript Reviewer — Finding #1 (CRITICAL)
- **File:** `src/main/ipc-handlers.ts:17-28`
- Every handler receives `...args: unknown[]` and returns `unknown`
- All `as` casts in handler bodies (lines 81, 82, 111) are consequences of this

## Proposed Solutions

### Option A: Generic secureHandle (Recommended)
Make `secureHandle` generic over `InvokeChannel`:
```typescript
function secureHandle<C extends InvokeChannel>(
  channel: C,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: IpcInvokeChannels[C]['args']) => IpcInvokeChannels[C]['return'] | Promise<IpcInvokeChannels[C]['return']>
): void
```
- **Pros:** Full compile-time enforcement, removes all `as` casts
- **Cons:** One `as` cast on args inside the wrapper (unavoidable, Electron strips types)
- **Effort:** Small
- **Risk:** Low

## Acceptance Criteria

- [ ] `secureHandle` is generic over channel name
- [ ] Handler args and return type are inferred from `IpcInvokeChannels`
- [ ] All `as` casts removed from handler bodies
- [ ] `npx tsc --noEmit` passes

## Work Log

| Date | Action |
|------|--------|
| 2026-03-24 | Created from code review |

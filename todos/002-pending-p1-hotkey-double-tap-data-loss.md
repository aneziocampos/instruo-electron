---
status: pending
priority: p1
issue_id: "002"
tags: [code-review, race-condition, data-integrity]
---

## Problem Statement

`stop()` in recording-engine.ts is async (awaits capture queue flush + thumbnail generation). During that await window, a second hotkey press sees `state = { status: 'idle' }` (transitional), falls into `case 'idle'`, and calls `startRecording()` which calls `clearSteps()` -- destroying all captured data. A user loses their entire recording by double-tapping Cmd+Shift+R.

## Findings

- `src/main/recording-engine.ts` lines 36-49: The `stop()` method is async. It transitions state to idle before the async cleanup completes, creating a window where the engine appears idle but is still flushing data.
- `src/main/hotkey-manager.ts` lines 24-43: The hotkey handler dispatches based on current `state.status`. When status is `'idle'`, it calls `startRecording()`, which calls `clearSteps()` to reset the step store.
- The race window exists between state transition and async cleanup completion. Any hotkey press during this window triggers a new recording that wipes the just-finished data.

## Proposed Solution

Add an `isTransitioning` guard flag in recording-engine.ts:

```typescript
private isTransitioning = false;

async stop(): Promise<void> {
  if (this.isTransitioning) return;
  this.isTransitioning = true;
  try {
    // existing stop logic: flush queue, generate thumbnail, transition state
  } finally {
    this.isTransitioning = false;
  }
}

async start(): Promise<void> {
  if (this.isTransitioning) return;
  // existing start logic
}
```

The hotkey handler should also check `isTransitioning` before dispatching, or the engine methods themselves should be the single guard point (preferred, since it centralizes the logic).

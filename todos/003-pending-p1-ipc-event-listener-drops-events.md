---
status: pending
priority: p1
issue_id: "003"
tags: [code-review, race-condition, frontend]
---

## Problem Statement

The `onRecordingStatusChanged` useEffect in App.tsx has `[view]` in its dependency array. Every view change tears down the old listener and creates a new one. During that gap, IPC events from the main process are silently dropped. If recording auto-stops (e.g., at 40 steps) during the gap, the user sees a frozen "Recording..." screen with no way to recover.

## Findings

- `src/renderer/src/App.tsx` lines 41-52: The useEffect subscribing to `onRecordingStatusChanged` includes `view` in its dependency array. This causes the listener to be unsubscribed and re-subscribed on every view transition.
- Between teardown and re-subscription, any IPC event emitted by the main process is lost. There is no buffering or replay mechanism.
- The auto-stop scenario (reaching the step limit) is particularly dangerous because it fires a single status-change event. If that event is dropped, the UI permanently shows the recording view with no way to proceed.

## Proposed Solution

Remove `view` from the dependency array and use a ref instead:

```typescript
const viewRef = useRef(view);
useEffect(() => {
  viewRef.current = view;
}, [view]);

useEffect(() => {
  const cleanup = window.api.onRecordingStatusChanged((status) => {
    // Use viewRef.current instead of view
    // This keeps the listener stable across view changes
    handleStatusChange(status, viewRef.current);
  });
  return cleanup;
}, []); // Empty dependency array -- listener is created once
```

This ensures the IPC listener is registered exactly once and never torn down during the app lifetime, eliminating the event-drop window entirely.

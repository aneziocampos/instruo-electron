---
status: pending
priority: p2
issue_id: "012"
tags: [code-review, race-condition, frontend]
---

## Problem Statement

Multiple renderer pages have async operations (fetchUsage, permission polling) without unmount guards. If the component unmounts while a promise is in-flight, callbacks fire on stale state. PermissionPage's `onAllGranted` calls parent `setView()` after unmount. IdlePage's `onSignOut` can fire twice.

## Findings

- `src/renderer/src/pages/PermissionPage.tsx` lines 12-34 — Permission polling interval fires async checks without an unmount guard. The `onAllGranted` callback can invoke the parent's `setView()` after the component has already unmounted.
- `src/renderer/src/pages/IdlePage.tsx` lines 15-32 — `fetchUsage` and `onSignOut` have no protection against firing on stale/unmounted state. `onSignOut` can potentially fire twice.
- `src/renderer/src/pages/ReviewPage.tsx` lines 20-29 — Async operations lack unmount guards, risking state updates on an unmounted component.

## Proposed Solution

Add the standard React cleanup pattern to every `useEffect` with async operations in each affected page:

```typescript
useEffect(() => {
  let active = true;

  // ... async operations ...
  someAsyncCall().then((result) => {
    if (!active) return;
    // safe to update state
  });

  return () => { active = false; };
}, [deps]);
```

Apply this pattern to:
1. `PermissionPage.tsx` — Guard the permission polling interval and `onAllGranted` callback.
2. `IdlePage.tsx` — Guard `fetchUsage` response handling and prevent double-fire of `onSignOut`.
3. `ReviewPage.tsx` — Guard all async callbacks.

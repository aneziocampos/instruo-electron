---
status: complete
priority: p2
issue_id: "004"
tags: [code-review, react, race-condition]
dependencies: []
---

# Fix timeout leak in AuthPage handleSignIn

## Problem Statement

`AuthPage.tsx` `handleSignIn` creates a `setTimeout` and returns a cleanup function, but it's called as an `onClick` handler so the cleanup is never captured. If auth succeeds or the component unmounts before 60s, `setLoading`/`setTimedOut` are called on an unmounted component.

## Proposed Solutions

### Option A: useRef for timeout ID (Recommended)
Store timeout in a ref, clear it in the `onTokenReceived` effect and on unmount.
- **Effort:** Small
- **Risk:** Low

## Acceptance Criteria

- [ ] Timeout is cleared when token is received
- [ ] Timeout is cleared on component unmount
- [ ] No React "setState on unmounted component" warnings

## Work Log

| Date | Action |
|------|--------|
| 2026-03-24 | Created from code review |

---
status: complete
priority: p2
issue_id: "005"
tags: [code-review, react, error-handling]
dependencies: []
---

# Handle promise rejections and error states in renderer

## Problem Statement

Multiple renderer components call IPC without `.catch()` handlers or error state handling:
- `App.tsx:11` — `getToken()` rejection leaves app stuck on loading spinner
- `IdlePage.tsx:15` — `fetchUsage()` failure shows blank header with no feedback
- `IdlePage.tsx` — `AUTH_EXPIRED` error should redirect to auth page
- `ipc-handlers.ts:48` — `shell.openExternal` promise not awaited

## Proposed Solutions

### Option A: Add error handling at each call site (Recommended)
- `App.tsx`: Add `.catch()` that falls through to auth view
- `IdlePage`: Check `result.error.code` and handle `AUTH_EXPIRED` (redirect) vs others (show error)
- `ipc-handlers.ts`: `await shell.openExternal()` or `.catch(log.error)`
- **Effort:** Small
- **Risk:** Low

## Acceptance Criteria

- [ ] App never gets stuck on loading spinner
- [ ] IdlePage shows error message on fetch failure
- [ ] AUTH_EXPIRED on usage fetch redirects to auth
- [ ] shell.openExternal rejection is logged

## Work Log

| Date | Action |
|------|--------|
| 2026-03-24 | Created from code review |

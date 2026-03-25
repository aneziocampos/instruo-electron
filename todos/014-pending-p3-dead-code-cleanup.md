---
status: complete
priority: p3
issue_id: "014"
tags: [code-review, cleanup, simplicity]
dependencies: []
---

# Remove ~237 lines of dead code + i18n gaps

## Items from Simplicity Review
1. Delete `useRecording.ts` (dead, never imported)
2. Remove dead upload event listeners from preload (3 handlers)
3. Remove dead crash recovery functions from step-store
4. Remove unused constants (4)
5. Remove unused exports (destroyTray, discard, flushTypingSession, checkAccessibilityPermission, UploadErrorCallback, TypedInvoke/TypedOn/EventChannel)
6. Remove no-op `handleKeyDown` stub
7. Strip unused native ElementInfo fields (value, help, x, y, width, height, childrenCount) + Rust helpers
8. Remove `automationId` from shared types (Windows-only concept)
9. Add i18n keys for PermissionPage + hardcoded strings
10. Remove `_teamId` state from ReviewPage (always null)
11. Pending states TTL expiration (auth-manager)

## Acceptance Criteria
- [ ] Dead code removed
- [ ] Build + typecheck pass
- [ ] ~200+ lines reduced

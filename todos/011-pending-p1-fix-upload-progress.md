---
status: complete
priority: p1
issue_id: "011"
tags: [code-review, broken-feature]
dependencies: []
---

# Upload progress events never fire — UploadPage progress bar broken

## Problem Statement
`UploadPage.tsx` subscribes to `upload:progress/error/complete` events but the main process never emits them. The `ipc-handlers.ts` upload handler uses invoke/return, not events. Progress bar stays at 0% until upload completes.

## Findings
- **Source:** Race Condition #7 (CERTAIN), Simplicity #1

## Acceptance Criteria
- [ ] Either wire up progress events from main process OR simplify UploadPage to show spinner
- [ ] Remove dead event channels if not wired up

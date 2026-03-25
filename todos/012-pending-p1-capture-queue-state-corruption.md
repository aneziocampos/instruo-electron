---
status: complete
priority: p1
issue_id: "012"
tags: [code-review, race-condition, bug]
dependencies: []
---

# Capture queue overwrites 'review' state back to 'recording'

## Problem Statement
If `stop()` is called while a capture is mid-flight in the queue, `processClick` completes and overwrites `state` from `{ status: 'review' }` back to `{ status: 'recording', startedAt: undefined }`. UI jumps to wrong page.

## Findings
- **Source:** Race Condition Reviewer #2 (MEDIUM/HIGH)
- **File:** `recording-engine.ts:116-131`

## Acceptance Criteria
- [ ] Re-check `state.status === 'recording'` AFTER processClick returns
- [ ] OR `stop()` awaits captureQueue before transitioning to review

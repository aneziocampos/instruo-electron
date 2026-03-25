---
status: complete
priority: p1
issue_id: "007"
tags: [code-review, race-condition, bug]
dependencies: []
---

# Countdown Esc does not actually cancel recording start

## Problem Statement
Pressing Esc during countdown sets view to 'idle' but the recursive setTimeout chain continues. When it reaches 0, `startRecording()` fires silently — invisible recording with global hooks active.

## Findings
- **Source:** TypeScript Reviewer #5 (HIGH), Race Condition Reviewer #1 (HIGH/HIGH)
- **File:** `src/renderer/src/App.tsx:57-76`
- The countdown function captures no cancellation token
- setTimeout callbacks fire regardless of view state changes

## Acceptance Criteria
- [ ] Pressing Esc during countdown clears all pending timeouts
- [ ] Recording does NOT start after Esc
- [ ] Use a ref-based cancellation token

---
status: complete
priority: p1
issue_id: "009"
tags: [code-review, ui-bug]
dependencies: []
---

# Review page action buttons permanently invisible

## Problem Statement
`ReviewPage.tsx:177` uses `group-hover:opacity-100` but the parent div lacks the `group` class. Move/delete buttons are always `opacity-0` — invisible and unclickable.

## Acceptance Criteria
- [ ] Add `group` class to parent div at line 149
- [ ] Action buttons visible on hover

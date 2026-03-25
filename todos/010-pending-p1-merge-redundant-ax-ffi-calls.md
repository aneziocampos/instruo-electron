---
status: complete
priority: p1
issue_id: "010"
tags: [code-review, performance]
dependencies: []
---

# Merge redundant AX FFI calls — 5 calls per click should be 3

## Problem Statement
`ax-client.ts` calls `getElementAtPosition` twice and `getParentChain` twice per click (once in `getElementAt`, once in `getAppInfo`). Each FFI call is 5-50ms blocking. Total waste: 10-100ms per click.

## Findings
- **Source:** TypeScript #8, Performance #1, Security M-3

## Acceptance Criteria
- [ ] Single `getFullElementInfo(x, y)` function replaces both
- [ ] 3 FFI calls per click max (element + parents + processName)
- [ ] capture-pipeline calls one function instead of two

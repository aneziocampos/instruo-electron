---
status: pending
priority: p3
issue_id: "021"
tags: [code-review, performance, frontend]
---

## Problem Statement
ReviewPage re-renders all 40 step rows on any title edit. Each keystroke runs `.map()` over all steps. Base64 thumbnail images cause unnecessary diffing.

## Findings
- `src/renderer/src/pages/ReviewPage.tsx` lines 147-206
- The step list is rendered inline via `.map()` with no memoization boundary.
- Every call to `setSteps` (e.g., on title edit) triggers a full re-render of the entire list.
- Base64 thumbnail strings are large props that React must diff on each render, adding to the cost.
- `handleMoveDown` and `handleMoveUp` perform bounds checks outside the `setSteps` updater, creating a potential stale-state issue.

## Proposed Solution
Extract the step row into a `React.memo()` component that receives stable callbacks (via `useCallback`) and only the individual step data it needs. Move bounds checks inside the `setSteps` updater function for `handleMoveDown`/`handleMoveUp` to avoid stale-state bugs.

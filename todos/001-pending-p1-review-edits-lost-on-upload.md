---
status: pending
priority: p1
issue_id: "001"
tags: [code-review, data-integrity, functional-bug]
---

## Problem Statement

User edits (step title changes, deletions, reorderings) in ReviewPage are stored in renderer-local React state only. The main process `guide:upload-all` handler reads from `stepStore.getSteps()` which has the ORIGINAL unedited steps. All user review edits are silently discarded on upload.

## Findings

- `src/renderer/src/pages/ReviewPage.tsx` lines 39-69: Step edits (title, description, delete, reorder) modify local React state via `setSteps()` but are never sent back to the main process.
- `src/main/ipc-handlers.ts` line 93: The `guide:upload-all` handler reads steps from `stepStore.getSteps()`, which returns the original captured data with no awareness of renderer-side edits.
- The upload payload is built entirely from main-process data, so any changes the user made in the review UI are silently lost.

## Proposed Solution

1. Extend `GuideUploadParams` in `src/shared/types.ts` to include an edited steps array:

```typescript
interface GuideUploadParams {
  // existing fields...
  steps: Array<{ id: string; title: string; description: string }>;
}
```

2. In `src/renderer/src/pages/ReviewPage.tsx`, pass the current (edited) steps state when invoking `guide:upload-all`.

3. In `src/main/ipc-handlers.ts`, merge the renderer-provided edits with the main-process step data (screenshots, metadata) before building the upload payload. The renderer edits should take precedence for `title` and `description`. Steps deleted in the renderer should be excluded. Step order from the renderer should be respected.

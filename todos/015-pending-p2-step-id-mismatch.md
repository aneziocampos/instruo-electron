---
status: pending
priority: p2
issue_id: "015"
tags: [code-review, data-integrity]
---

## Problem Statement

In global-hooks.ts, a `stepId` is generated via `crypto.randomUUID()` for the screenshot filename. In capture-pipeline.ts, a DIFFERENT `randomUUID()` is generated for the step's `id`. The screenshot file is named `{globalHooksId}.jpg` but the step has `id: {pipelineId}`. The `screenshotPath` correctly points to the file, but step ID and filename don't match, causing confusion during debugging.

## Findings

- `src/main/global-hooks.ts` line 59 — Generates a `stepId` via `crypto.randomUUID()` and uses it to name the screenshot file as `{stepId}.jpg`.
- `src/main/capture-pipeline.ts` line 49 — Generates a separate `id` via `crypto.randomUUID()` for the step object.
- The step's `screenshotPath` correctly references the file on disk (using the global-hooks ID), but the step's own `id` is a different UUID (from capture-pipeline).
- This mismatch makes debugging difficult: given a step ID, you cannot find its screenshot by name, and given a screenshot filename, you cannot find the corresponding step by ID.

## Proposed Solution

Generate the step ID exactly once and use it consistently:

**Option A (preferred):** Generate the ID in `global-hooks.ts` and pass it through to `capture-pipeline.ts` as a parameter. The pipeline uses this ID as the step's `id`, ensuring the screenshot filename and step ID match.

**Option B:** Generate the ID in `capture-pipeline.ts` and have the pipeline rename the screenshot file to match the step ID after creation.

Option A is preferred because it avoids an extra filesystem operation and keeps the ID generation closer to the screenshot capture.

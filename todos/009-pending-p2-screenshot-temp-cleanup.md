---
status: pending
priority: p2
issue_id: "009"
tags: [code-review, security, filesystem]
---

## Problem Statement

`cleanupSessionDir()` only deletes `session.jsonl`, not the individual `{stepId}.jpg` screenshot files. Screenshots accumulate in temp dir across sessions. On crash, all screenshots persist indefinitely. These may contain sensitive content (passwords, financial data).

## Findings

- `src/main/step-store.ts` lines 107-113 — `cleanupSessionDir()` only removes `session.jsonl`, leaving orphaned screenshot `.jpg` files behind.
- `src/main/screenshot-annotator.ts` line 14 — Screenshots are written to the session directory with `{stepId}.jpg` filenames.
- After a crash, the entire session directory (including all screenshot files) persists in the OS temp folder indefinitely.

## Proposed Solution

1. Replace the current `cleanupSessionDir()` implementation with `rm(SESSION_DIR, { recursive: true, force: true })` to remove the entire session directory and all its contents.
2. Add startup cleanup logic (e.g., in `app.whenReady()`) that scans for and deletes leftover session directories from previous crashed sessions.
3. Ensure the session directory is recreated fresh at the start of each new recording session.

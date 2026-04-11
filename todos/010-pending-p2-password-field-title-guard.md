---
status: pending
priority: p2
issue_id: "010"
tags: [code-review, security, privacy]
---

## Problem Statement

`isPassword` is detected by ax-client.ts but never checked by step-title-generator.ts. If a password field has a descriptive name, it could leak into step titles. Screenshots of password fields may also contain visible characters.

## Findings

- `src/main/ax-client.ts` line 48 — The `isPassword` property is correctly detected from the UI Automation element.
- `src/main/step-title-generator.ts` — No check for `isPassword` exists anywhere in the title generation logic. A password field named e.g. "Bank Password" would generate a step title like "Type in Bank Password", potentially leaking sensitive context into the recorded guide.

## Proposed Solution

1. Add an early guard at the top of `generateStepTitle` in `src/main/step-title-generator.ts`:
   ```typescript
   if (element.isPassword) return 'Type in [password field]';
   ```
2. Consider also adding a flag to the step metadata indicating the step involves a password field, so the review page can optionally warn the user or blur the screenshot.

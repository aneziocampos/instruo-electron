---
status: pending
priority: p2
issue_id: "014"
tags: [code-review, build, dependencies]
---

## Problem Statement

`sharp` is used in screenshot-annotator.ts and step-store.ts via `require('sharp')` with try/catch fallback. But sharp is not listed in package.json dependencies. In production builds, it silently falls back to unannotated screenshots and full-size thumbnails. Screenshot annotation is a core feature.

## Findings

- `package.json` — `sharp` is not listed in either `dependencies` or `devDependencies`.
- `src/main/screenshot-annotator.ts` line 41 — Uses `require('sharp')` wrapped in try/catch. If sharp is not available, annotation silently fails and returns the unannotated screenshot.
- `src/main/step-store.ts` line 57 — Uses `require('sharp')` wrapped in try/catch for thumbnail generation. Falls back to full-size images if sharp is unavailable.
- In production/packaged builds, sharp will never be available since it is not in dependencies, meaning screenshot annotation and thumbnail generation silently degrade to no-ops.

## Proposed Solution

1. Add `sharp` to production `dependencies` in `package.json`:
   ```json
   "dependencies": {
     "sharp": "^0.33.x"
   }
   ```
2. Add sharp to the `asarUnpack` list in `electron-builder.yml` since it contains native bindings that cannot run from within an asar archive:
   ```yaml
   asarUnpack:
     - "node_modules/sharp/**"
   ```
3. Convert the `require('sharp')` calls to static imports (see issue 013).
4. Keep a try/catch wrapper only for graceful degradation logging (log a warning if sharp fails at runtime), but do not silently swallow the failure.

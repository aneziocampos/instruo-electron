---
status: pending
priority: p2
issue_id: "013"
tags: [code-review, typescript, type-safety]
---

## Problem Statement

Multiple runtime `require()` calls return `any`, losing type safety on critical paths. Includes `require('./step-store')` in will-quit handler (data-loss prevention path), `require('sharp')` in screenshot processing, `require('@electron-toolkit/utils')` duplicate in will-navigate handler, `require('electron')` for systemPreferences/desktopCapturer.

## Findings

- `src/main/index.ts` line 75 — `require('./step-store')` in the `will-quit` handler returns `any`. This is a data-loss prevention path where type safety is critical.
- `src/main/index.ts` line 163 — `require('@electron-toolkit/utils')` duplicate import via require in will-navigate handler.
- `src/main/ipc-handlers.ts` lines 19, 158-175 — `require('electron')` for systemPreferences and desktopCapturer returns untyped values.
- `src/main/step-store.ts` line 57 — `require('sharp')` returns `any`.
- `src/main/screenshot-annotator.ts` line 41 — `require('sharp')` returns `any`.
- `src/main/tray-manager.ts` lines 76-77 — Runtime `require()` calls to break circular deps return `any`.

## Proposed Solution

1. Replace circular-dep `require()` calls with static imports from the new `window-manager.ts` module (see issue 011).
2. For `sharp`: add `@types/sharp` as a devDependency and convert to a static import with proper typing.
3. For `@electron-toolkit/utils`: use the existing static import instead of the duplicate `require()`.
4. For `electron` submodules (systemPreferences, desktopCapturer): use static `import { systemPreferences, desktopCapturer } from 'electron'` at the top of the file.
5. For `step-store` in will-quit: fix the circular dependency (via issue 011) so a static import can be used.

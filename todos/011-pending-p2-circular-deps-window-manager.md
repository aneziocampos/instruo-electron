---
status: pending
priority: p2
issue_id: "011"
tags: [code-review, architecture]
---

## Problem Statement

5 modules create circular import chains through `index.ts` to access `getMainWindow()`. Broken by runtime `require()` calls that lose type safety. The `index.ts` module is both entry point and service locator.

## Findings

- `src/main/index.ts` — Acts as both the app entry point and the provider of `getMainWindow()` / `resizeWindow()`, making it a dependency for multiple modules that it also imports.
- `src/main/hotkey-manager.ts` — Circular dependency on `index.ts`.
- `src/main/tray-manager.ts` — Circular dependency on `index.ts`.
- `src/main/recording-engine.ts` — Circular dependency on `index.ts`.
- `src/main/global-hooks.ts` — Circular dependency on `index.ts`.
- `src/main/ipc-handlers.ts` — Circular dependency on `index.ts`.
- Multiple modules use runtime `require('./index')` to break the circular dependency at load time, but this returns `any` and loses all TypeScript type safety.

## Proposed Solution

1. Extract `getMainWindow()` and `resizeWindow()` into a new `src/main/window-manager.ts` module that has no imports from `index.ts`.
2. In `src/main/index.ts`, after creating the BrowserWindow, call `windowManager.setMainWindow(win)` to register it.
3. Replace all `require('./index')` and circular imports across `hotkey-manager.ts`, `tray-manager.ts`, `recording-engine.ts`, `global-hooks.ts`, and `ipc-handlers.ts` with a proper static `import { getMainWindow } from './window-manager'`.
4. This also unblocks issue 013 (untyped require calls) for the circular-dep cases.

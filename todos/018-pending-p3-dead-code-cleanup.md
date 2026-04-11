---
status: pending
priority: p3
issue_id: "018"
tags: [code-review, simplicity]
---

## Problem Statement
~148 lines of dead code identified across the codebase, adding maintenance burden and cognitive overhead.

## Findings
- **15 unused translation keys** in `src/renderer/src/i18n/en.ts` + `src/renderer/src/i18n/pt.ts`
- **`STEP_ACTION_TYPES` array** in shared types — only the derived TypeScript type is used, the runtime array is never referenced
- **`IpcEventChannels` interface** — declared but never consumed by any listener
- **`ClickContext` export** — exported by name but never imported by name elsewhere
- **`UploadProgressCallback` export** — exported but only used once in the same file
- **4 unused `StepActionType` values** (`type`, `check`, `select`, `shortcut`) — defined but never produced by the recording engine
- **Unused native FFI fields** (`value`, `help`, `x`, `y`, `width`, `height`, `childrenCount`) — declared in both Rust `lib.rs` and `instruo-native.d.ts`, fetched over COM but never read by JS
- **Unused Tailwind tokens** (`warning`, `border-focus`) in `tailwind.config.js`
- **Unused `checkAccessibility` native export** — exported but never called
- **Redundant `app.whenReady()`** in `src/main/hotkey-manager.ts` — already guaranteed by caller

## Proposed Solution
Delete each item. For native FFI fields, remove from both Rust `lib.rs` and `instruo-native.d.ts` to also improve capture performance by skipping unnecessary COM queries.

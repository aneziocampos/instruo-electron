---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, ipc, agent-parity]
---

## Problem Statement

`recording:resume` has no IPC channel. The recording engine has `resume()` and it's callable from hotkey and tray menu, but no IPC channel exists. An agent or test harness that pauses recording has no way to resume it. Also, the tray "Resume" menu item bypasses the hotkey-manager orchestration layer, directly calling recording-engine and global-hooks.

## Findings

- `src/shared/ipc-channels.ts` — No `recording:resume` channel defined in `IpcInvokeChannels`.
- `src/main/ipc-handlers.ts` — No `secureHandle` registration for resume.
- `src/preload/index.ts` — No resume method exposed to renderer.
- `src/main/tray-manager.ts` lines 76-78 — Tray "Resume" menu item calls recording-engine and global-hooks directly, bypassing hotkey-manager orchestration.

## Proposed Solution

1. Add `'recording:resume': { args: []; return: void }` to `IpcInvokeChannels` in `src/shared/ipc-channels.ts`.
2. Register a `secureHandle` for the new channel in `src/main/ipc-handlers.ts`.
3. Expose `resumeRecording()` in the preload bridge (`src/preload/index.ts`).
4. Add a `resumeRecording()` function to `hotkey-manager.ts` that orchestrates the resume across recording-engine and global-hooks.
5. Update the tray "Resume" menu item in `src/main/tray-manager.ts` to call `hotkey-manager.resumeRecording()` instead of directly calling recording-engine and global-hooks.

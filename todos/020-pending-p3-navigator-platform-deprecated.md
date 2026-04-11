---
status: pending
priority: p3
issue_id: "020"
tags: [code-review, deprecation]
---

## Problem Statement
`navigator.platform` is deprecated. Used in App.tsx and IdlePage.tsx for hotkey display.

## Findings
- `src/renderer/src/App.tsx` line 174
- `src/renderer/src/pages/IdlePage.tsx` line 44
- Both files use `navigator.platform` to detect macOS and show the correct modifier key (Cmd vs Ctrl) in hotkey hints.
- `navigator.platform` is deprecated in modern browsers and may be removed or return empty string in future Chromium versions bundled with Electron.

## Proposed Solution
Use `navigator.userAgentData?.platform` with fallback to `navigator.platform`, or (preferred) pass the platform string from the main process via a preload constant so the renderer never needs to sniff the user agent.

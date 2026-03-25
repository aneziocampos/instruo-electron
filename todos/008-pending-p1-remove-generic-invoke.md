---
status: complete
priority: p1
issue_id: "008"
tags: [code-review, security]
dependencies: []
---

# Remove generic invoke from preload — bypasses IPC safety

## Problem Statement
`preload/index.ts:40-41` exposes unrestricted `invoke(channel, ...args)` that accepts any channel string, bypassing the typed IPC contract.

## Findings
- **Source:** Security Sentinel H-1 (HIGH)
- Any renderer-side XSS could call ANY ipcMain handler

## Acceptance Criteria
- [ ] Generic `invoke` method removed from preload
- [ ] PermissionPage uses typed methods instead

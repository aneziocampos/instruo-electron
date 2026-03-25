---
status: complete
priority: p2
issue_id: "003"
tags: [code-review, security]
dependencies: []
---

# Stop sending raw bearer token to renderer

## Problem Statement

`deep-link.ts:56` sends the actual bearer token via IPC `auth:token-received`. The renderer never uses the token value — it only needs to know auth succeeded. Sending credentials to the renderer increases attack surface (devtools, XSS).

## Proposed Solutions

### Option A: Signal-only event (Recommended)
Change `auth:token-received` to send no args (or a boolean). Renderer just needs to know auth succeeded.
- **Effort:** Small
- **Risk:** Low

## Acceptance Criteria

- [ ] `auth:token-received` event sends no sensitive data
- [ ] Renderer treats event as a signal, not a data source

## Work Log

| Date | Action |
|------|--------|
| 2026-03-24 | Created from code review |

---
status: pending
priority: p3
issue_id: "017"
tags: [code-review, security]
---

## Problem Statement
`pendingStates` Set in auth-manager.ts grows unboundedly. No TTL, no max size. Old states remain valid indefinitely.

## Findings
- `src/main/auth-manager.ts` lines 12, 58-65
- The `pendingStates` collection is a plain `Set<string>` that never evicts entries.
- Each OAuth login attempt adds a state token, but consumed or expired tokens are never pruned.
- An attacker who intercepts an old state token could replay it at any future time.

## Proposed Solution
Switch to `Map<string, number>` (state -> timestamp). Add 5-minute TTL. Cap at 5 entries. On each `add`, sweep expired entries first and reject if at capacity.

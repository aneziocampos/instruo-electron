---
status: complete
priority: p1
issue_id: "002"
tags: [code-review, typescript, security]
dependencies: []
---

# Validate API response bodies before trusting `as` casts

## Problem Statement

`api-client.ts` uses `as` type assertions on API responses without runtime validation. If the API returns an unexpected shape, the app silently corrupts state (e.g., storing `undefined` as the auth token).

## Findings

- **Source:** TypeScript Reviewer — Finding #4 (HIGH)
- `api-client.ts:49` — `(await response.json()) as { token: string }` — no check that `token` exists
- `api-client.ts:106` — `data.guide.public_slug` — crashes if shape differs
- `api-client.ts:69` — usage response fields assumed without validation

## Proposed Solutions

### Option A: Guard critical fields (Recommended)
Add minimal runtime checks after `as` assertions for the 3 response types:
```typescript
if (!data.token || typeof data.token !== 'string') {
  throw new Error('Invalid auth response: missing token')
}
```
- **Effort:** Small
- **Risk:** Low

## Acceptance Criteria

- [ ] `exchangeAuthCode` validates `data.token` is a non-empty string
- [ ] `createGuide` validates `data.guide.public_slug` exists
- [ ] `fetchUsage` validates critical fields exist

## Work Log

| Date | Action |
|------|--------|
| 2026-03-24 | Created from code review |

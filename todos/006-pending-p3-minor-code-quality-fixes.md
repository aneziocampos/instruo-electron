---
status: complete
priority: p3
issue_id: "006"
tags: [code-review, quality, cleanup]
dependencies: []
---

# Minor code quality fixes from review

## Findings

1. **i18n `t()` replaces only first param occurrence** — `i18n/index.ts:26` — use `replaceAll` instead of `replace`
2. **Hardcoded guide URL** — `api-client.ts:183` — use `APP_BASE_URL` constant
3. **Hotkey display assumes non-Mac** — `IdlePage.tsx:68` — should show Cmd on macOS
4. **Dead export `getDeepLinkUrl`** — `deep-link.ts:65` — unused, duplicates logic in index.ts
5. **`JSX.Element` return type deprecated** — use `React.ReactNode` or infer
6. **Hardcoded URLs in components** — AuthPage/IdlePage should use constants

## Acceptance Criteria

- [ ] `t()` uses `replaceAll` for param substitution
- [ ] Guide URL uses `APP_BASE_URL`
- [ ] Dead `getDeepLinkUrl` removed
- [ ] Component URLs from constants

## Work Log

| Date | Action |
|------|--------|
| 2026-03-24 | Created from code review |

---
status: complete
priority: p2
issue_id: "013"
tags: [code-review, security, performance, quality]
dependencies: []
---

# P2 assorted fixes from code review

## Items
1. **Fake timeout on sync FFI** — `capture-pipeline.ts:97-119` — Replace Promise wrapper with direct try/catch
2. **Remove base64 token fallback** — `auth-manager.ts:36-38` — Gate behind `is.dev`
3. **Session dir permissions** — `step-store.ts` — Set 0600 on temp files
4. **Double JPEG decode** — `screenshot-annotator.ts:38` — Pass width/height from caller, remove metadata() call
5. **Stale closure in deleteStep** — `ReviewPage.tsx:44-47` — Use functional updater
6. **Flush on quit** — `index.ts` — Add `will-quit` handler calling `stepStore.flush()`
7. **Auth deep link at App level** — `App.tsx` — Listen for `auth:authenticated` globally
8. **Redact auth code from logs** — `deep-link.ts:6` — Replace code param before logging
9. **Remove unused _screenshotBuffer param** — 3 files in call chain
10. **Unsafe cast in recording-engine:129** — Extract startedAt before closure
11. **Add `sharp` to dependencies** — `npm install sharp` (currently not in package.json, annotations silently fail)
12. **Font CSP gap** — Add `https://fonts.googleapis.com` to `style-src` in CSP, or self-host fonts
13. **Stale tray step count** — Update tray menu after each step capture

## Acceptance Criteria
- [ ] All 13 items addressed
- [ ] Build + typecheck pass

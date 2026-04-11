---
status: pending
priority: p1
issue_id: "005"
tags: [code-review, i18n, functional-bug]
---

## Problem Statement

Multiple UI views have hardcoded English strings instead of using `t()`, breaking the Portuguese locale for Brazilian users (the primary market). The entire PermissionPage has zero `t()` calls. The countdown view and upload view also use inline English. Meanwhile, translation keys for many of these strings already exist in the locale files but are unused.

## Findings

- `src/renderer/src/pages/PermissionPage.tsx` (all text): Every string in this page is hardcoded English. No `t()` calls at all. This is the permissions setup flow that every new user sees.
- `src/renderer/src/App.tsx` lines 154-175: The countdown view ("Recording starts in...") uses hardcoded English strings.
- `src/renderer/src/App.tsx` line 201: The upload progress view ("Uploading step X of Y...") uses hardcoded English.
- `src/renderer/src/i18n/en.ts` and `src/renderer/src/i18n/pt.ts`: Approximately 15 translation keys exist for these views but are never referenced in code (dead keys). Some keys under `lgpd.*` namespace may be truly unused and should be cleaned up.

## Proposed Solution

1. **PermissionPage**: Add translation keys for all strings in both `en.ts` and `pt.ts`. Replace every hardcoded string with `t('key')` calls. Expected keys:
   - `permissions.title`
   - `permissions.description`
   - `permissions.screenRecording`
   - `permissions.accessibility`
   - `permissions.granted` / `permissions.notGranted`
   - `permissions.openSettings`
   - `permissions.continue`

2. **Countdown view** in App.tsx: Replace hardcoded "Recording starts in..." with existing `t('recording.countdown', { seconds })` key.

3. **Upload view** in App.tsx: Replace hardcoded "Uploading step X of Y..." with existing `t('upload.progress', { current, total })` key.

4. **Dead key cleanup**: Audit `en.ts` and `pt.ts` for keys not referenced anywhere in `src/renderer/`. Remove truly unused keys (e.g., `lgpd.*` if confirmed dead). Keep keys that are used.

5. Verify both locales render correctly by switching language in dev mode.

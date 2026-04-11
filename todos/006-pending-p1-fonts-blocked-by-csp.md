---
status: pending
priority: p1
issue_id: "006"
tags: [code-review, security, ui]
---

## Problem Statement

Google Fonts are loaded via CSS `@import url('https://fonts.googleapis.com/...')` in globals.css. The Content Security Policy sets `style-src 'self' 'unsafe-inline'` which does NOT include `https://fonts.googleapis.com`, so the import is blocked in production builds. Fonts silently fail to load, causing the app to fall back to system fonts and breaking the intended design (DM Sans + Syne).

## Findings

- `src/renderer/src/styles/globals.css` line 1: Contains `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:...')` to load DM Sans and Syne fonts from Google Fonts CDN.
- `src/main/index.ts` line 103: CSP header is set with `style-src 'self' 'unsafe-inline'` -- no allowance for `fonts.googleapis.com` or `fonts.gstatic.com` (where the actual font files are served).
- Even if `fonts.googleapis.com` were added to `style-src`, the actual woff2 files from `fonts.gstatic.com` would also need to be added to `font-src`, compounding the CSP surface area.
- For a desktop app, depending on an external CDN for core fonts is fragile (offline scenarios, network issues, corporate firewalls).

## Proposed Solution

Bundle the fonts locally to eliminate the network dependency entirely:

1. Download DM Sans and Syne woff2 files from Google Fonts (or use `google-webfonts-helper`).

2. Place font files in `src/renderer/src/assets/fonts/`:
   ```
   fonts/
     dm-sans-regular.woff2
     dm-sans-500.woff2
     dm-sans-700.woff2
     syne-700.woff2
     syne-800.woff2
   ```

3. Replace the `@import` in `globals.css` with local `@font-face` declarations:
   ```css
   @font-face {
     font-family: 'DM Sans';
     font-style: normal;
     font-weight: 400;
     font-display: swap;
     src: url('../assets/fonts/dm-sans-regular.woff2') format('woff2');
   }
   /* ... additional weights and Syne faces */
   ```

4. Remove the Google Fonts `@import` line entirely.

5. No CSP changes needed -- `'self'` already covers bundled assets.

This also removes the Google tracking/privacy concern for a desktop app and ensures fonts work offline.

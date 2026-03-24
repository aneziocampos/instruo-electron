# Brainstorm: Instruo Desktop App

**Date:** 2026-03-24
**Status:** Ready for Planning

## What We're Building

A desktop application for **Windows first** (macOS later) that records step-by-step guides from ANY application — not just the browser. Same concept as the Chrome extension (instruo-chrome), but for desktop software (Excel, Slack, SAP, native apps, etc.).

## Why

- The Chrome extension only captures actions inside the browser. Many business processes involve desktop applications.
- Target users (Brazilian SMBs) primarily use Windows.
- Scribe already offers desktop recording as a premium feature — Instruo needs parity.
- A desktop app captures the full workflow regardless of which application the user is in.

## Key Decisions

### 1. Platform: Windows First, macOS Later
- **Why:** Target users (Brazilian SMBs) are primarily on Windows.
- macOS support comes in a future phase.

### 2. Stack: Electron (TypeScript/React + Node.js)
- **Why Electron:** Single codebase for Mac + Windows, reuse existing JS/TS/React skills, mature ecosystem (VS Code, Slack, Figma desktop all use Electron).
- **Frontend:** React (can share components with instruo-app)
- **Backend:** Node.js with native modules for OS-level APIs
- **Screenshot capture:** Electron's `desktopCapturer` API
- **Element detection:** Windows UI Automation via `node-winautomation`

### 3. Element Detection: Accessibility API Only (for MVP)
- **Why:** This is the industry standard. Scribe uses the same approach — their desktop app "integrates into the OS using accessibility access designed for screen readers."
- Scribe acknowledges desktop detection is less accurate than browser detection because "the desktop app must work with varying levels of accessibility data provided by different software vendors."
- **Future differentiator:** Add AI vision fallback (Claude Vision API) for apps with poor accessibility support.

### 4. MVP Scope: Full Chrome Extension Parity (minus narration)
- Click detection + screenshots + step review + upload
- AI writer selection, step editing, i18n (PT-BR + EN)
- Team assignment, guide type selection
- 40-step limit per recording (same as Chrome extension)
- Sensitive field detection (passwords) via UIA `IsPassword` property
- **Excluded from MVP:** Audio narration (add later)

### 5. Auth: Browser Redirect (Deep Link)
- Open `app.instruo.ai` login in user's default browser
- User logs in with existing credentials or Google OAuth
- Server redirects to `instruo://auth?token=xxx` deep link
- Electron registers the `instruo://` protocol and captures the token
- Same pattern as the Chrome extension — minimal new backend work
- **Backend dependency:** Need to add `/auth/desktop_callback` route in instruo-app

### 6. Distribution: Direct Download from instruo.ai
- Host the installer (.exe) on instruo.ai
- Auto-updates via `electron-updater`
- Code signing required to avoid Windows SmartScreen warnings (~$200-400/year for certificate)
- Microsoft Store deferred to later for enterprise credibility

### 7. Coexists with Chrome Extension
- Chrome extension remains for browser-only users (lighter, easier to install)
- Desktop app targets users who need to record desktop apps
- Separate products, same API, same user account

### 8. Pricing: Available on All Plans
- Any user (including Free) can use the desktop app
- Differentiate on guide limits and AI credits, not client type
- Maximizes adoption (competitive advantage: Scribe gates desktop to Pro/Enterprise)

### 9. Recording UX: System Tray + Global Hotkey
- App minimizes to system tray during recording
- Tray icon changes color to indicate recording state
- Global hotkey (e.g., `Ctrl+Shift+R`) to start/stop recording
- 3-2-1 countdown overlay before recording starts
- After stop: Instruo window reappears with step review page
- Tray context menu: Stop Recording, Pause, Cancel

### 10. Key Libraries
- **Global hooks:** `uiohook-napi` — 8k weekly downloads, actively maintained (March 2026), N-API, prebuilt binaries, cross-platform. Community standard successor to `iohook`.
- **Windows UI Automation:** `node-winautomation` — MIT licensed, N-API, wraps full COM `IUIAutomation` interface. New library (Feb 2026) but has exact API needed: `elementFromPoint()`, tree walking, all UIA properties. **Fallback:** Fork and maintain if author abandons, or build minimal custom N-API addon (~500 lines C++).

### Rejected Alternatives

- **Tauri (Rust):** Smaller app size but requires learning Rust. Fewer examples for accessibility API integration.
- **Native per-platform (Swift + C#):** Best accessibility integration but two separate codebases. Double maintenance.
- **OCR-only approach:** Simpler but less precise. No structured element data (button names, field labels).
- **In-app login form:** Much more work than browser redirect. Would need to reimplement auth UI, Google OAuth, CAPTCHA, etc.
- **iohook:** Deprecated, breaks with each new Electron version. Replaced by `uiohook-napi`.
- **C# helper process for UIA:** More durable .NET bindings but adds C# to the stack and ~50ms per call overhead.

## Architecture

### Electron Process Model

```
Main Process (Node.js)
  ├── uiohook-napi         → Global mouse/keyboard hooks
  │     └── on mousedown   → get (x, y) screen coordinates
  ├── node-winautomation    → Windows UI Automation
  │     ├── elementFromPoint(x, y) → element metadata
  │     ├── currentName, currentControlType, isPassword
  │     └── walk parent hierarchy → app/window context
  ├── desktopCapturer       → Screenshot at click moment
  ├── Recording engine      → State machine, step storage, 40-step limit
  ├── Tray manager          → System tray icon, context menu
  └── IPC bridge            → Communicates with renderer

Renderer Process (React)
  ├── Auth screen           → Shows login prompt, handles deep link token
  ├── Idle screen           → Start recording button, settings, guide list
  ├── Review page           → Step editor, reorder, delete, lightbox
  ├── Upload screen         → Progress bar, guide creation
  └── Settings              → AI writer, guide type, team, language
```

### Recording Flow (per click)

1. `uiohook-napi` fires `mousedown` event with `(x, y)` coordinates
2. Check if click is on Instruo's own window → ignore if so
3. Capture screenshot via `desktopCapturer` (pre-click state)
4. Query `node-winautomation.elementFromPoint(x, y)` for element metadata
5. Generate step title from element metadata (adapted from Chrome extension's `element-descriptor.js` pattern)
6. Annotate screenshot with red click indicator circle
7. Store step: `{ title, screenshot, clickX, clickY, controlType, appName, ... }`
8. If step count reaches 40 → auto-stop recording

### Keystroke Detection (for "type" steps)

1. `uiohook-napi` fires `keydown` events during recording
2. Check if focused element is a text input (via UIA `controlType`)
3. Debounce keystrokes (same pattern as Chrome extension)
4. Merge typed value into the most recent click step's description
5. Mask value if element's `isPassword` is true → "****"

## How Windows UI Automation Works

Windows UI Automation is an OS-level API that describes UI elements structurally — originally for screen readers. It knows element type (button, field, menu), label text, position, and hierarchy.

**What it provides per click:**
- Element type (button, text field, dropdown, etc.)
- Element label/name ("Submit", "Email", "File menu")
- Position on screen (bounding rectangle)
- Parent window/app context
- Hierarchy (which form, which dialog, which app)
- `IsPassword` flag for sensitive fields

**Limitations:**
- Not all apps implement accessibility well (games, custom renderers)
- Quality of step titles depends on how well each app exposes accessibility data
- Some apps expose minimal element information
- Electron apps themselves have decent UIA support (since Chromium exposes accessibility)

## Backend Changes Needed (instruo-app)

These changes are required in the Rails app to support the desktop client:

1. **New auth callback route:** `GET /auth/desktop_callback` — redirects to `instruo://auth?token=xxx`
2. **New source value:** Accept `source: 'desktop'` on `POST /api/v1/guides`
3. **Deep link redirect page:** A simple page that triggers the `instruo://` protocol redirect after login

## What Can Be Reused from Chrome Extension

These parts can share patterns or even code (ported to TypeScript):
- API client (REST calls to instruo-app)
- Step data model (title, description, screenshot, click coordinates, viewport dimensions)
- Review page before upload (React inside Electron)
- i18n system (PT-BR + EN, `t()` function pattern)
- Screenshot annotation logic (red click indicator circle via OffscreenCanvas/Canvas)
- Element descriptor / step title generation patterns (adapted for UIA metadata instead of DOM)
- Upload logic with sequential step upload and progress tracking

## What's Completely New

- Windows UI Automation integration via `node-winautomation`
- Global system event listeners via `uiohook-napi`
- Screen capture outside the browser (`desktopCapturer`)
- App/window detection (foreground app tracking via UIA parent hierarchy)
- System tray integration with recording state
- Global hotkey registration
- Deep link protocol registration (`instruo://`)
- Auto-update mechanism (`electron-updater`)
- Code signing for Windows
- Windows installer (.exe via `electron-builder`)

## Resolved Questions

- **Start with Mac or Windows first?** → Windows first (target users are on Windows)
- **Distribution?** → Direct download from instruo.ai
- **Coexist with Chrome extension?** → Yes, separate products
- **Pricing?** → Available on all plans
- **Element detection approach?** → Accessibility API only for MVP (matches Scribe)
- **Auth flow?** → Browser redirect with deep link
- **MVP scope?** → Full extension parity minus audio narration
- **Recording UX?** → System tray + global hotkey (Ctrl+Shift+R)
- **Libraries?** → `uiohook-napi` for hooks, `node-winautomation` for UIA (fork if needed)
- **Step limit?** → 40 steps per recording (same as extension)
- **Sensitive data?** → Mask password fields via UIA `IsPassword` property

## Open Questions

_(None — all key decisions have been made)_

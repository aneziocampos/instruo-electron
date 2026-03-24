# Brainstorm: Instruo Desktop App

**Date:** 2026-03-24
**Status:** Exploring

## What We're Building

A cross-platform desktop application (Mac + Windows) that records step-by-step guides from ANY application — not just the browser. Similar to what the Chrome extension does, but for desktop software (Figma, Excel, Slack, native apps, etc.).

## Why

The Chrome extension only captures actions inside the browser. Many business processes involve desktop applications. A desktop app would capture the full workflow regardless of which application the user is in.

## Key Decision: Electron + Accessibility APIs

### Stack: Electron (TypeScript/React + Node.js)

- **Why Electron:** Single codebase for Mac + Windows, reuse existing JS/TS/React skills, mature ecosystem (VS Code, Slack, Figma desktop all use Electron)
- **Frontend:** React (can share components with instruo-app)
- **Backend:** Node.js with native modules for OS-level APIs
- **Screenshot capture:** Electron's `desktopCapturer` API
- **Element detection:** OS Accessibility APIs via Node native modules

### Rejected Alternatives

- **Tauri (Rust):** Smaller app size but requires learning Rust. Fewer examples for accessibility API integration.
- **Native per-platform (Swift + C#):** Best accessibility integration but two separate codebases. Double maintenance.
- **OCR-only approach:** Simpler but less precise. No structured element data (button names, field labels). Not a definitive solution.

## How Accessibility APIs Work

Accessibility APIs are OS-level systems that describe UI elements structurally — originally for screen readers. They know element type (button, field, menu), label text, position, and hierarchy.

**macOS:** `AXUIElement` API. User must grant Accessibility permission in System Preferences.

**Windows:** `UI Automation` API. Well-documented, more verbose than macOS.

**What they provide per click:**
- Element type (button, text field, dropdown, etc.)
- Element label/name ("Submit", "Email", "File menu")
- Position on screen
- Parent window/app context
- Hierarchy (which form, which dialog, which app)

## Technical Challenges (Ranked by Difficulty)

### 1. Accessibility API Integration (Hardest — 70% of effort)
- Different APIs on Mac vs Windows — no shared code for this layer
- Not all apps implement accessibility well (games, custom renderers like Figma canvas)
- Need to quickly traverse the element tree on each click to identify what was clicked
- Mac requires explicit user permission grant
- Some apps expose minimal element information

### 2. Global Event Listening
- Capture mouse clicks and keyboard input system-wide
- Requires elevated permissions on both platforms
- Must distinguish between recording clicks and UI navigation clicks
- Need to correlate click position with accessibility element at that position

### 3. Screenshot Capture
- Relatively easy with Electron's `desktopCapturer`
- Need to capture the correct screen (multi-monitor support)
- Annotation layer (red click indicator) like the Chrome extension
- Performance — screenshots must be fast to not miss the UI state

### 4. App/Window Context
- Detect which application is in the foreground
- Track when the user switches between apps
- Handle multi-window scenarios

### 5. API Integration
- Same REST API as Chrome extension (`POST /api/v1/guides`, `/steps`, `/audio`)
- Bearer token auth (already built)
- Upload screenshots + step data + optional audio narration

## Effort Estimate

| Component | Effort | Notes |
|-----------|--------|-------|
| Electron shell + basic UI | 1-2 weeks | Recording controls, settings, auth |
| Screenshot capture + annotation | 1 week | desktopCapturer + canvas overlay |
| Global click/key listeners | 1-2 weeks | Platform-specific, permissions |
| macOS Accessibility API | 3-4 weeks | AXUIElement, element tree traversal |
| Windows UI Automation | 3-4 weeks | Separate implementation |
| API integration (upload to instruo-app) | 1 week | Reuse Chrome extension patterns |
| Audio narration capture | 1 week | System audio + mic |
| Testing + polish | 2-3 weeks | Cross-platform edge cases |

**Total estimate: 3-4 months** for a solid v1 on both platforms.

**MVP (single platform, e.g., Mac only): 6-8 weeks.**

## What's Similar to Chrome Extension

These parts can share patterns or even code:
- API client (REST calls to instruo-app)
- Step data model (title, description, screenshot, click coordinates)
- Audio narration recording + upload
- Review page before upload (could be a React webview inside Electron)

## What's Completely New

- Accessibility API integration (the core challenge)
- Global system event listeners
- Screen capture outside the browser
- App/window detection
- OS permission management
- Auto-update mechanism (Electron has `electron-updater`)
- Code signing for Mac + Windows (required for distribution)

## Open Questions

- Start with Mac or Windows first?
- Distribution: direct download from instruo.ai, or also Mac App Store / Microsoft Store?
- Should it coexist with the Chrome extension, or would the desktop app eventually replace it for browser recording too?
- Pricing: same plans, or a separate "Desktop" tier?

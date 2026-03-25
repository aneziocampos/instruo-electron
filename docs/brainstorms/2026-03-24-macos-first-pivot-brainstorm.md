# Brainstorm: macOS-First Pivot for Instruo Desktop App

**Date:** 2026-03-24
**Status:** Decisions Made
**Supersedes:** Original brainstorm (Windows-first) — docs/brainstorms/2026-03-24-desktop-app-brainstorm.md

## What Changed

Pivoting from **Windows first** to **macOS first**. The developer is on macOS and doesn't have a Windows machine. The existing Phase 1 code (Electron scaffold, auth, API client, IPC, tray, i18n, pages) is already cross-platform — only the element detection layer (Phase 2) is platform-specific.

## What Stays the Same

Everything from the original brainstorm except the platform-specific parts:
- Electron + TypeScript + React stack
- `uiohook-napi` for global hooks (already cross-platform)
- `desktopCapturer` for screenshots (already cross-platform)
- Auth flow (authorization code exchange via deep link)
- API integration (same REST API)
- System tray + global hotkey UX
- Available on all plans
- 40-step limit
- Dark theme, i18n (PT-BR + EN)

## Key Changes

### 1. Platform: macOS First, Windows Later
- **Why:** Developer is on macOS. No Windows machine available.
- Phase 1 code is already cross-platform.
- Windows support (node-winautomation) comes in a future phase.

### 2. Element Detection: macOS Accessibility API via custom napi-rs addon
- **Why:** No existing npm package exposes `AXUIElementCopyElementAtPosition` (the macOS equivalent of Windows' `ElementFromPoint`).
- **Approach:** Build a custom native addon using **napi-rs** (Rust) + **accessibility-sys-ng** crate.
- **Scope:** ~5-8 functions to wrap:
  - `AXUIElementCreateSystemWide()` — create system-wide accessibility object
  - `AXUIElementCopyElementAtPosition(element, x, y)` — element at screen position
  - `AXUIElementCopyAttributeValue(element, attribute)` — read any property (role, title, value, subrole, etc.)
  - `AXUIElementCopyAttributeNames(element)` — list available attributes
  - `AXUIElementCreateApplication(pid)` — target specific app
  - `AXUIElementGetPid(element)` — get owning process ID
  - `AXIsProcessTrusted()` / `AXIsProcessTrustedWithOptions()` — check accessibility permission
- **Why napi-rs:** Production-proven (Prisma, SWC, Next.js), generates TypeScript types, prebuilt binaries for ARM64 + x86_64, memory-safe Rust.
- **Fallback:** If napi-rs + Rust proves too complex, fall back to Objective-C++ N-API addon or node-swift.

### 3. macOS Permissions
- **Accessibility permission:** Required for both `uiohook-napi` (global hooks) and the AXUIElement addon. User must grant in System Preferences > Privacy & Security > Accessibility.
  - Check: `systemPreferences.isTrustedAccessibilityClient(false)`
  - Prompt: `systemPreferences.isTrustedAccessibilityClient(true)` — opens System Preferences
- **Screen Recording permission:** Required for `desktopCapturer`.
  - Check: `systemPreferences.getMediaAccessStatus('screen')`
  - The first `desktopCapturer.getSources()` call triggers the OS prompt
  - App must be restarted after granting
- **Permission flow:** On first launch, show a setup screen explaining why permissions are needed, with buttons to grant each one. Check status and show green checkmarks as they're granted.
- **Use `node-mac-permissions`** (v2.5.0, 237 stars) for comprehensive permission management.

### 4. Distribution: macOS DMG (not NSIS)
- **electron-builder** produces `.dmg` for macOS
- Code signing: Apple Developer certificate ($99/year)
- Notarization: Required for macOS Gatekeeper (via `electron-notarize`)
- Auto-updates: Same `electron-updater` with generic provider

### 5. Deep Link Protocol on macOS
- `app.setAsDefaultProtocolClient('instruo')` works differently on macOS
- macOS uses `open-url` event (not `second-instance` + `process.argv`)
- The `Info.plist` must declare the URL scheme
- electron-builder handles this via the `protocols` config

### Rejected Alternatives for Element Detection

- **@nut-tree/element-inspector:** Paid ($75/mo), no `elementFromPoint` API
- **koffi FFI:** Too fragile with CoreFoundation types, sandbox issues with Electron
- **Python/Swift CLI subprocess:** IPC overhead, fragile
- **acacia (Igalia):** Experimental, complex build, not production-ready

## macOS Accessibility API Overview

macOS Accessibility API (`AXUIElement`) provides:
- **Element role** (AXRole): Button, TextField, StaticText, Window, etc.
- **Element title** (AXTitle): "Save", "Email", "File menu"
- **Element value** (AXValue): text field content, checkbox state
- **Element description** (AXDescription): accessible description
- **Position** (AXPosition) + **Size** (AXSize): bounding rect
- **Help text** (AXHelp): tooltip-like description
- **Parent/children** (AXParent, AXChildren): hierarchy traversal
- **Subrole** (AXSubrole): more specific role (e.g., AXSecureTextField for passwords)
- **Is focused** (AXFocused): whether the element has focus

**Password detection:** `AXSubrole == AXSecureTextField` (equivalent to Windows `IsPassword`)

**Limitations:** Same as Windows — not all apps implement accessibility well. Electron apps have decent accessibility. Native macOS apps (Finder, Mail, Safari) have excellent accessibility.

## Element Detection Priority (macOS adaptation)

1. **AX Roles + Subroles** (highest): AXButton → "Click on [Title]", AXCheckBox → "Check/Uncheck [Title]", AXPopUpButton → "Select [Value] in [Title]"
2. **AX Attributes**: Read AXTitle, AXDescription, AXValue, AXHelp for label resolution
3. **Parent Hierarchy Walking**: If element name is empty, walk AXParent to find a meaningful container (AXWindow, AXGroup with title)
4. **Fallback**: "Click on [Window Title]" using the owning application name, or "Click at (x, y)"

## Architecture Impact

The `ElementDetector` interface defined in the plan already abstracts the platform:

```typescript
interface ElementDetector {
  getElementAt(x: number, y: number): Promise<ElementInfo | null>
  dispose(): void
}
```

- **macOS implementation:** `src/main/ax-client.ts` (napi-rs Rust addon)
- **Windows implementation (future):** `src/main/uia-client.ts` (node-winautomation)
- **Recording engine** depends on the interface, not the implementation

## Resolved Questions

- **macOS or Windows first?** → macOS first (developer is on macOS)
- **Element detection approach?** → Custom napi-rs addon wrapping AXUIElement
- **Why not an existing package?** → No npm package exposes `AXUIElementCopyElementAtPosition`
- **Permissions?** → Accessibility + Screen Recording, guided setup flow
- **Distribution?** → DMG via electron-builder, Apple Developer cert ($99/year)
- **Deep links on macOS?** → `open-url` event + Info.plist URL scheme

## Open Questions

_(None — all key decisions made)_

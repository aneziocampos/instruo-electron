---
title: "feat: Instruo Desktop App — Windows Step-by-Step Guide Recorder"
type: feat
status: active
date: 2026-03-24
origin: docs/brainstorms/2026-03-24-desktop-app-brainstorm.md
---

# Instruo Desktop App — Windows Step-by-Step Guide Recorder

## Enhancement Summary

**Deepened on:** 2026-03-24
**Sections enhanced:** All major sections
**Review agents used:** Architecture Strategist, Security Sentinel, Performance Oracle, TypeScript Reviewer, Race Condition Reviewer, Code Simplicity Reviewer, Pattern Recognition Specialist, Deployment Verification Agent, Frontend Design Reviewer, Agent-Native Architecture Reviewer, Native Module Packaging Researcher

### Critical Architecture Changes (Must Address Before Implementation)

1. **Eager screenshot capture.** Take screenshots immediately on `mousedown` (before queuing). Pass the buffer into the capture queue for remaining processing. Without this, screenshots under rapid clicking will show wrong UI state. *(Architecture, Performance, Race Condition — all 3 reviewers flagged this)*

2. **Disk-based screenshots.** Write JPEG buffers to temp files immediately after annotation. Store only file paths in `CapturedStep`, not `Buffer` objects. Reduces memory by 10-35MB, fixes IPC serialization issues (Buffer → Uint8Array), and makes crash recovery viable. Generate 200px thumbnails for the review page. *(Architecture, Performance, TypeScript)*

3. **Worker thread for UIA queries.** Move all `node-winautomation` COM calls to a `worker_threads` Worker with a 1-second hard timeout. Synchronous COM calls block the main process event loop for 50-2000ms. Fallback to "Click on [Window Title]" on timeout. *(Performance — single most impactful change)*

4. **Split recording engine into 3 modules.** `RecordingEngine` (state machine + queue), `CapturePipeline` (per-click orchestration of screenshot→UIA→annotate→store), `StepStore` (in-memory collection + disk persistence). The current plan puts all responsibility in one module that will exceed 500 lines. *(Architecture)*

5. **Bidirectional IPC type split.** Split `IpcChannels` into `IpcInvokeChannels` (request/response) and `IpcEventChannels` (fire-and-forget). Makes it structurally impossible to `invoke` an event channel. *(TypeScript — CRITICAL)*

6. **Auth flow: use authorization code exchange.** Do NOT pass the raw bearer token in the deep link URL (`instruo://auth?token=xxx`). Tokens in URLs leak via process args, event logs, and crash reporters. Instead: deep link sends a short-lived, single-use `code`, which the app exchanges for a token via HTTPS. *(Security — CRITICAL)*

### High-Priority Improvements

7. **Discriminated union for RecordingState.** Each state carries its own data (`{ status: 'recording', stepCount, startedAt }` vs `{ status: 'uploading', progress }`). Prevents parallel state variables from going out of sync. *(TypeScript)*

8. **Typed error/Result strategy.** Define `AppError` union and `Result<T, E>` type. IPC channels that can fail return `Result<T>` instead of throwing untyped exceptions. *(TypeScript)*

9. **Move upload orchestration to main process.** If the renderer crashes during upload, progress is lost. Main process should drive the upload loop; renderer displays progress via IPC events. *(Architecture)*

10. **Retroactive double-click detection.** Process the first click immediately. If a second click arrives within 500ms at the same position, retroactively upgrade the step to "double-click." Do NOT wait 500ms on every single click. *(Performance, Race Condition)*

11. **State guard at every entry point.** Every event handler must check `this.state !== STATE_RECORDING` as its first instruction and bail out. Prevents ghost events after stop, 41st click overrun, and countdown-phase clicks. *(Race Condition — 3 separate races fixed by one pattern)*

12. **Complete CSP.** Add `script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://app.instruo.ai https://releases.instruo.ai; object-src 'none'; form-action 'none'`. *(Security)*

13. **`asarUnpack` for native modules.** Native `.node` files cannot run from inside ASAR. Must configure in electron-builder.yml: `asarUnpack: ["node_modules/uiohook-napi/**", "node_modules/node-winautomation/**", "**/*.node"]`. *(Deployment — build will fail without this)*

### MVP Scope Simplifications

14. **Simplify state machine to 4 engine states:** `IDLE → RECORDING ↔ PAUSED → REVIEW → IDLE`. Countdown is a UI delay before calling start. Upload/success are renderer page states, not engine states. *(Simplicity)*

15. **Remove speculative step fields:** Drop `titleMeta` (title regeneration not in scope), `recordedAtMs` (no feature uses relative timing). Reduces per-step memory and serialization. *(Simplicity)*

16. **Defer auto-updates to post-MVP.** Users re-download from instruo.ai for first releases. Removes `update-manager.ts`, simplifies Phase 4. *(Simplicity — saves ~1 week)*

17. **Eliminate Settings Page.** Move sign-out to Idle Page. Language auto-detected from OS. AI writer/guide type/team selected per-guide on Review Page (already there). *(Simplicity)*

18. **Show countdown in main window, not separate BrowserWindow.** Avoids second window lifecycle, transparency rendering issues, multi-monitor positioning. *(Simplicity, Frontend)*

19. **Add Esc to cancel during countdown.** Users who accidentally trigger recording need an escape hatch. *(Frontend — significant UX gap)*

### Naming & Pattern Fixes

20. **Rename `screenWidth/Height` → `viewportWidth/Height`** to match Chrome extension and Rails API parameter names. *(Pattern Consistency)*

21. **Use camelCase for new action types:** `rightClick`, `doubleClick` instead of kebab-case. Remove `navigate` (browser-only concept). *(Pattern Consistency, Simplicity)*

22. **Rename `pt-BR.ts` → `pt.ts`** to match ecosystem locale code convention (`pt`, not `pt-BR`). *(Pattern Consistency)*

### Security Hardening

23. **Pre-recording LGPD warning.** Display prominent warning before recording starts that screenshots capture all visible content. Require acknowledgment. Add redaction tool in Review page (blur/black-out areas). *(Security — CRITICAL for Brazilian market)*

24. **Validate `shell.openExternal` URLs.** Strict HTTPS-only allowlist (`instruo.ai`, `app.instruo.ai`). Never allow `file://`, `javascript:`, `data:` protocols. *(Security)*

25. **Validate IPC sender on ALL handlers,** not just "sensitive" ones. Use a `secureHandle()` wrapper that checks `event.senderFrame.url`. *(Security)*

26. **Idempotent step uploads.** Include step `id` (UUID) as idempotency key. Server skips duplicates on retry. Prevents duplicate steps from network failures. *(Race Condition)*

### Frontend Design

27. **Define window sizes per state.** Auth: 400×500px. Idle: 420×600px. Review/Upload/Success: 1000×700px (resizable, min 800×600). Remember position in electron-store. *(Frontend)*

28. **Define complete color token system.** 12+ tokens for dark theme: `--bg-primary` (#0d1117), `--bg-card` (#161b25), `--bg-elevated` (#1c2333), `--accent` (#22c55e), `--danger` (#ef4444), `--text-primary` (#e6edf3), `--text-secondary` (#8b949e), `--border` (rgba(255,255,255,0.06)), etc. *(Frontend)*

29. **Two-panel review layout.** Left: step list (60%). Right: selected step's screenshot preview (40%). Avoids constant lightbox toggling. *(Frontend)*

### Deployment

30. **Remote error reporting.** Integrate Sentry Electron SDK. Without it, production errors are invisible. *(Deployment, Architecture)*

31. **Sign `.node` files in afterPack hook.** Windows Defender flags unsigned native binaries. Sign all `.node` files during the build. *(Deployment, Security)*

32. **Atomic upload of release artifacts.** Upload `.exe` first, verify accessible, THEN upload `latest.yml`. Prevents "update available but file missing" window. *(Deployment)*

---

## Overview

Build an Electron desktop application for Windows that records step-by-step guides from ANY desktop application — not just the browser. The app captures user clicks and keystrokes system-wide, identifies clicked elements via Windows UI Automation, takes annotated screenshots, and uploads guides to the instruo-app backend. This extends Instruo's recording capability beyond the Chrome extension to cover desktop workflows (Excel, SAP, Slack, native apps, etc.).

**Target users:** Brazilian SMBs primarily on Windows.
**Competitive context:** Scribe gates desktop recording to Pro/Enterprise plans. Instruo offers it on all plans.

## Problem Statement / Motivation

The Chrome extension (instruo-chrome) only captures actions inside the browser. Many business processes span desktop applications — ERP systems, spreadsheets, messaging apps, file management. Users cannot document these workflows with the current extension. A desktop app bridges this gap and puts Instruo at parity with Scribe's desktop recorder while offering it at a more accessible price point (all plans vs. Pro/Enterprise only).

(see brainstorm: `docs/brainstorms/2026-03-24-desktop-app-brainstorm.md`)

## Proposed Solution

An Electron app (TypeScript + React) that:

1. Authenticates via browser deep link with authorization code exchange (`instruo://auth?code=xxx`)
2. Captures global mouse/keyboard events via `uiohook-napi`
3. Identifies clicked elements via `node-winautomation` (Windows UI Automation)
4. Takes screenshots via Electron's `desktopCapturer` (JPEG, ~90ms)
5. Annotates screenshots with red click indicators
6. Presents a step review/edit page (React)
7. Uploads guides to the existing instruo-app REST API with `source: 'desktop'`

## Technical Approach

### Architecture

```
Main Process (Node.js)
  ├── uiohook-napi           → Global mouse/keyboard hooks
  ├── node-winautomation      → Windows UI Automation queries (worker thread)
  ├── desktopCapturer         → Screenshot capture (JPEG @ 80%)
  ├── Recording Engine        → State machine (4 states), capture queue
  ├── Capture Pipeline        → Per-click orchestration (screenshot→UIA→annotate→store)
  ├── Step Store              → In-memory collection + disk persistence (JSONL)
  ├── UIA Client              → node-winautomation wrapper (worker thread)
  ├── Step Title Generator    → UIA metadata → human-readable title (4-layer priority)
  ├── Screenshot Annotator    → Red click circle (sharp, pre-generated overlay)
  ├── Tray Manager            → System tray icon + context menu
  ├── Hotkey Manager          → globalShortcut (Ctrl+Shift+R)
  ├── Deep Link Handler       → instruo:// protocol + single instance lock
  ├── Auth Manager            → Token storage (electron-store + safeStorage)
  ├── API Client              → REST client + upload orchestration
  └── IPC Bridge              → Type-safe bidirectional IPC (invoke + events)

Preload Script
  └── contextBridge           → Exposes typed API to renderer (no nodeIntegration)

Renderer Process (React + TypeScript)
  ├── Auth Page               → Sign in prompt, deep link code handling
  ├── Idle Page               → Start recording, sign out, usage info
  ├── Review Page             → Step editor, reorder, delete, two-panel layout
  └── Upload/Success Page     → Progress display (main process drives upload)
```

### Project Structure

```
instruo-electron/
├── electron-builder.yml              # Packaging + code signing
├── electron.vite.config.ts           # Unified Vite config (main, preload, renderer)
├── package.json
├── tsconfig.json
├── tsconfig.node.json                # Main + preload (Node.js target)
├── tsconfig.web.json                 # Renderer (browser target)
├── resources/
│   ├── icon.ico                      # App icon (multi-size ICO)
│   ├── tray-idle.ico                 # Tray icon states
│   ├── tray-recording.ico
│   └── tray-paused.ico
├── src/
│   ├── shared/                       # Types shared across all processes
│   │   ├── ipc-channels.ts           # Bidirectional IPC contracts (Invoke + Event)
│   │   ├── types.ts                  # Step, RecordingState, ElementInfo, etc.
│   │   ├── errors.ts                 # AppError union + Result<T> type
│   │   └── constants.ts              # MAX_STEPS, PROTOCOL, etc.
│   ├── main/                         # Main process (Node.js)
│   │   ├── index.ts                  # Entry: app lifecycle, window, single instance
│   │   ├── ipc-handlers.ts           # secureHandle() wrapper + registrations
│   │   ├── recording-engine.ts       # State machine (4 states), capture queue
│   │   ├── capture-pipeline.ts       # Per-click: screenshot→UIA→annotate→store
│   │   ├── step-store.ts             # In-memory collection + JSONL disk persistence
│   │   ├── uia-client.ts             # node-winautomation wrapper (worker thread)
│   │   ├── step-title-generator.ts   # UIA metadata → title (4-layer priority, pure fn)
│   │   ├── screenshot-capture.ts     # desktopCapturer + multi-monitor + source cache
│   │   ├── screenshot-annotator.ts   # Red click circle (sharp, pre-generated overlay)
│   │   ├── global-hooks.ts           # uiohook-napi setup
│   │   ├── tray-manager.ts           # System tray icon + context menu
│   │   ├── hotkey-manager.ts         # globalShortcut registration
│   │   ├── deep-link.ts              # Protocol handler + code exchange
│   │   ├── auth-manager.ts           # Token storage (safeStorage encryption)
│   │   └── api-client.ts             # REST client + upload orchestration
│   ├── main/types/
│   │   └── node-winautomation.d.ts   # Type augmentation for UIA bindings
│   ├── preload/
│   │   └── index.ts                  # contextBridge with typed wrappers
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx              # React entry
│           ├── App.tsx               # Root + router
│           ├── types/
│           │   └── electron.d.ts     # Window.electronAPI augmentation
│           ├── hooks/
│           │   ├── useAuth.ts
│           │   └── useRecording.ts   # Exposes discriminated RecordingState
│           ├── pages/
│           │   ├── AuthPage.tsx
│           │   ├── IdlePage.tsx      # Start recording, sign out, usage info
│           │   ├── ReviewPage.tsx    # Two-panel: step list + screenshot preview
│           │   └── UploadPage.tsx    # Progress display (main process drives upload)
│           ├── components/
│           │   └── ui/
│           ├── i18n/
│           │   ├── index.ts          # t() function, locale detection
│           │   ├── pt.ts             # Portuguese (renamed from pt-BR)
│           │   └── en.ts
│           ├── lib/
│           │   └── api.ts            # Calls via electronAPI bridge
│           └── styles/
│               └── globals.css       # Dark theme (Tailwind + color tokens)
└── docs/
    ├── brainstorms/
    └── plans/
```

### Key Technology Choices

| Purpose | Package | Rationale |
|---------|---------|-----------|
| Framework | `electron` ^34.x | Cross-platform, mature, reuses JS/TS/React skills |
| Build | `electron-vite` ^2.x | Fastest DX, unified config for main/preload/renderer |
| Packaging | `electron-builder` ^25.x | Best NSIS installer + auto-update support |
| Auto-updates | `electron-updater` ^6.x | Generic provider for self-hosted updates from instruo.ai |
| React | `react` ^18.x | Shared patterns with instruo-app |
| Global hooks | `uiohook-napi` | 8k weekly downloads, N-API, prebuilt binaries, cross-platform |
| UI Automation | `node-winautomation` | Full Windows UIA COM bindings, MIT, N-API. Fork if abandoned. |
| Storage | `electron-store` ^10.x | Typed JSON config + `safeStorage` for token encryption |
| Logging | `electron-log` ^5.x | File + console logging for debugging |

(see brainstorm: Key Decisions #2, #10)

### Build Tooling Configuration

**`electron.vite.config.ts`:**
- Main process: `externalizeDepsPlugin()` to keep native modules (`uiohook-napi`, `node-winautomation`) as runtime require()
- Preload: `externalizeDepsPlugin()`
- Renderer: `@vitejs/plugin-react`, `@/` path alias, Tailwind CSS

**`electron-builder.yml`:**
- Target: NSIS installer for Windows x64
- Protocol registration: `instruo://`
- Auto-update: generic provider pointing to `https://releases.instruo.ai/desktop/`
- Code signing: EV certificate via `WIN_CSC_LINK` environment variable

### Security Model

```typescript
new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, '../preload/index.js'),
    contextIsolation: true,      // Isolate preload from renderer
    nodeIntegration: false,      // No Node APIs in renderer
    sandbox: true,               // Chromium sandbox
    webSecurity: true,           // Same-origin policy
    webviewTag: false,           // No <webview>
    navigateOnDragDrop: false
  }
})
```

- **IPC:** Type-safe channels defined in `src/shared/ipc-channels.ts`. Preload exposes named functions only (never raw `ipcRenderer`). Main process validates `event.senderFrame` on sensitive handlers.
- **CSP:** `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://app.instruo.ai; object-src 'none'; form-action 'none'`
- **Token storage:** Encrypted via `Electron.safeStorage` (wraps Windows DPAPI)
- **Navigation:** Prevent renderer from navigating to external URLs. External links open in default browser via `shell.openExternal()`.

### IPC Contract — REVISED per TypeScript review

```typescript
// src/shared/ipc-channels.ts

// Request/response channels (renderer invokes, main handles)
export interface IpcInvokeChannels {
  'auth:get-token': { args: []; return: Result<string | null> }
  'auth:sign-out': { args: []; return: void }
  'auth:open-login': { args: []; return: void }
  'recording:start': { args: []; return: void }
  'recording:stop': { args: []; return: void }
  'recording:pause': { args: []; return: void }
  'recording:cancel': { args: []; return: void }
  'recording:get-state': { args: []; return: RecordingState }
  'recording:get-steps': { args: []; return: StepThumbnail[] }
  'guide:upload-all': { args: [params: GuideUploadParams]; return: Result<GuideResponse> }
  'usage:fetch': { args: []; return: Result<UsageResponse> }
  'app:open-external': { args: [url: string]; return: void }  // URL validated server-side
}

// Event channels (main sends, renderer listens)
export interface IpcEventChannels {
  'auth:token-received': { args: [token: string] }
  'recording:status-changed': { args: [state: RecordingState] }
  'upload:progress': { args: [uploaded: number, total: number] }
  'upload:error': { args: [error: AppError] }
  'upload:complete': { args: [guideUrl: string] }
}

// Typed wrappers (enforce at compile time)
type TypedInvoke = <C extends keyof IpcInvokeChannels>(
  channel: C, ...args: IpcInvokeChannels[C]['args']
) => Promise<IpcInvokeChannels[C]['return']>

type TypedOn = <C extends keyof IpcEventChannels>(
  channel: C, callback: (...args: IpcEventChannels[C]['args']) => void
) => () => void  // returns unsubscribe function
```

**Changes from original plan:**
- Split into `IpcInvokeChannels` + `IpcEventChannels` (structurally prevents misuse)
- Removed `recording:auto-stopped` (merged into `recording:status-changed` with reason in `RecordingState`)
- Removed `updater:update-available` (auto-updates deferred to post-MVP)
- Changed `guide:create` + `guide:upload-step` → `guide:upload-all` (upload orchestration in main process)
- Added `recording:get-state` and `recording:get-steps` (pull state on mount — fixes IPC race during React transitions)
- Added `upload:progress/error/complete` events (main process drives upload, renderer displays)
- IPC channels that can fail return `Result<T>` instead of throwing untyped exceptions
- `TypedOn` returns `() => void` for React useEffect cleanup

### Recording Engine State Machine — REVISED per deepening

```typescript
// Discriminated union — each state carries its own data
type RecordingState =
  | { status: 'idle' }
  | { status: 'recording'; stepCount: number; startedAt: number }
  | { status: 'paused'; stepCount: number; pausedAt: number }
  | { status: 'review'; steps: StepThumbnail[] }

// Engine only owns 4 states. Countdown is a UI delay before calling start.
// Upload/success are renderer page routing, not engine states.
```

```
IDLE → (start) → RECORDING ↔ (pause/resume) → PAUSED
RECORDING/PAUSED → (stop/limit) → REVIEW
RECORDING/PAUSED → (cancel) → IDLE
REVIEW → (discard) → IDLE
```

**Capture queue with error boundaries** (enhanced from Chrome extension):
```typescript
private captureQueue: Promise<void> = Promise.resolve()

private enqueue(task: () => Promise<void>): void {
  this.captureQueue = this.captureQueue
    .then(task)
    .catch((error) => {
      logger.error('Capture task failed', { error })
      // Queue continues — one failure must not kill subsequent captures
    })
}

onMouseDown(event: UiohookMouseEvent): void {
  if (this.state.status !== 'recording') return  // State guard
  const screenshotPromise = this.capturePipeline.captureScreenshot(event.x, event.y)  // EAGER
  this.enqueue(() => this.capturePipeline.processClick(event, screenshotPromise))
}
```

**Module decomposition** (3 modules, not 1):
- `RecordingEngine` — state machine, capture queue, transition validation
- `CapturePipeline` — per-click workflow (screenshot → UIA worker → annotate → store)
- `StepStore` — in-memory step collection, disk persistence (JSONL), crash recovery

### Recording Flow (per click) — REVISED per deepening

1. `uiohook-napi` fires `mousedown` with absolute screen `(x, y)` and `button`
2. **State guard:** If `this.state !== RECORDING` → discard (prevents ghost events, 41st click overrun)
3. **Filter self-clicks:** Check if `(x, y)` is within Instruo's own window bounds or tray area → skip
4. **Filter non-primary clicks:** Only left-click (button 1) and right-click (button 3) are captured
5. **IMMEDIATELY capture screenshot** (before queuing): `desktopCapturer` → find display containing `(x, y)` → `NativeImage.toJPEG(80)` (~90ms). This runs outside the capture queue to ensure the screenshot reflects the actual moment of click, not a delayed state.
6. **Retroactive double-click check:** If two mousedowns at same position within 500ms, upgrade the previous step's `actionType` to `doubleClick` and discard this event. No 500ms wait on single clicks.
7. **Enqueue remaining work** (serialized via capture queue):
   a. **Flush pending typing session** if any
   b. **Query UI Automation** (on worker thread, 1s timeout): `elementFromPoint({ x, y })` → element metadata. On timeout → fallback title.
   c. **Walk parent hierarchy** via `controlViewWalker` → app name, window title, form context
   d. **Generate step title** from UIA metadata (4-layer priority system)
   e. **Annotate screenshot** with red click circle via `sharp.composite()` with pre-generated circle overlay
   f. **Write annotated JPEG to temp file** (`%TEMP%/instruo-session/{stepId}.jpg`)
   g. **Store step metadata** (file path, not buffer) to in-memory array
   h. **Persist session metadata to disk** (debounced, max 1/second, JSONL append for crash safety)
   i. If step count reaches 40 → auto-stop with notification
8. **Notify renderer:** Send step count via IPC (action counter + pulse, not live feed)

### Keystroke Detection

1. `uiohook-napi` fires `keydown` during recording
2. **Ignore modifier-only keys** (Ctrl, Alt, Shift, Meta alone)
3. **Detect keyboard shortcuts:** If modifier + key (e.g., Ctrl+S) → create a "Pressed Ctrl+S" step
4. **Text input:** If no modifier, check if the last click step's element was a text input (UIA `controlType` = Edit, ComboBox) → debounce 300ms → merge typed value into step description
5. **Password masking:** If element's `currentIsPassword` is true → store `"••••"` instead of actual value

### Element Detection Priority (adapted from Chrome extension's 4-layer system)

1. **UIA Control Patterns** (highest): InvokePattern → "Click on [Name]", TogglePattern → "Check/Uncheck [Name]", SelectionPattern → "Select [Value] in [Name]"
2. **UIA Control Types**: Button, Edit, ComboBox, CheckBox, MenuItem, TreeItem, ListItem, Hyperlink, etc.
3. **Parent Hierarchy Walking**: If the raw element name is empty or generic, walk up to find a meaningful parent (Window, Group, Pane with a name)
4. **Fallback**: "Click on [Window Title]" using the foreground process name, or "Click at (x, y)" as last resort

### Step Data Model — REVISED per deepening

```typescript
// Action types: camelCase, no kebab-case. 'navigate' removed (browser-only concept).
const STEP_ACTION_TYPES = [
  'click', 'rightClick', 'doubleClick', 'type', 'check', 'select', 'shortcut'
] as const
type StepActionType = (typeof STEP_ACTION_TYPES)[number]

// UIA element info — null when detection fails (games, custom renderers, UAC)
interface ElementInfo {
  readonly controlType: number
  readonly name: string
  readonly automationId: string
  readonly className: string
  readonly isPassword: boolean
  readonly parentNames: readonly string[]
}

interface CapturedStep {
  id: string                    // crypto.randomUUID()
  timestamp: number             // Date.now()
  title: string                 // Human-readable step title
  description: string           // Typed value, shortcut, or empty
  actionType: StepActionType
  typedValue: string | null     // Masked ("••••") if password field
  element: ElementInfo | null   // null = detection failed, fallback title used
  screenshotPath: string        // Temp file path (NOT Buffer — see Enhancement #2)
  click: { x: number; y: number; button: 'left' | 'right' }
  screen: { width: number; height: number; displayId: string }
  app: { name: string; windowTitle: string }
}

// Renderer receives thumbnails, not full screenshots
interface StepThumbnail {
  id: string
  title: string
  description: string
  actionType: StepActionType
  thumbnailDataUrl: string      // 200px-wide JPEG data URL (~10KB)
  app: { name: string; windowTitle: string }
}
```

**Changes from original plan:**
- Removed `recordedAtMs` (no feature uses relative timing)
- Removed `titleMeta` (title regeneration not in scope; title is editable)
- Removed `navigate` action type (browser-only concept)
- Changed `screenshotJpegBuffer: Buffer` → `screenshotPath: string` (disk-based)
- Grouped coordinates into `click`, `screen`, `app` sub-objects
- Renamed `screenWidth/Height` → `screen.width/height` (viewport parity with API)
- Added `ElementInfo | null` with `readonly` properties (UIA snapshots are immutable)
- Added `StepThumbnail` type for renderer (never send full screenshots over IPC)
- Used `StepActionType` const array for runtime validation + derived type

### API Integration

Same REST API as Chrome extension. Key changes:

| Endpoint | Change for Desktop |
|----------|--------------------|
| `POST /api/v1/guides` | Send `source: 'desktop'` instead of `source: 'extension'` |
| `POST /api/v1/guides/:slug/steps` | Same FormData format (title, description, screenshot, coordinates) |
| `GET /api/v1/usage` | Same — fetch user info, plan limits, AI writers |

**Upload strategy:** Sequential step upload with per-step retry (3 attempts, exponential backoff). Progress tracked by step index for resume on failure. Guide creation validated before starting upload (check plan limits via `/api/v1/usage`).

### Authentication Flow — REVISED per security review

1. App generates a random `state` parameter (`crypto.randomBytes(32).toString('hex')`), stores it in a `Set<string>` in memory (handles multiple sign-in attempts)
2. Opens `https://app.instruo.ai/login?from=desktop&state={state}` in default browser
3. User authenticates (email/password or Google OAuth)
4. Server generates a **short-lived, single-use authorization code** and redirects to `instruo://auth?code=xxx&state={state}` (NOT the raw token — see Enhancement #6)
5. Electron captures the deep link (via `second-instance` event if running, or `process.argv` if cold start)
6. **Validates `state` matches** (removes from Set — consumed). Rejects if unknown state.
7. **Exchanges code for token** via HTTPS: `POST /api/v1/auth/exchange { code }` → returns `{ token }`. Code expires in 60 seconds, single-use.
8. Encrypts token via `safeStorage.encryptString()`, stores in `electron-store`
9. Sends `auth:token-received` IPC to renderer
10. If already authenticated when a deep link arrives → silently discard

**Why authorization code exchange:** Raw tokens in URLs leak via process command-line arguments (visible in Task Manager), Windows Event Logs, crash reporters, and `electron-log` if argv is logged. The code exchange pattern (OAuth 2.0 standard) limits exposure to a 60-second, single-use code.

**Token lifecycle:** Long-lived API token (same as Chrome extension). No expiration for MVP. Validated on app launch via `GET /api/v1/usage`. On 401 → clear stored token → show auth page. **Acknowledged tech debt:** Add token expiration + refresh token mechanism post-MVP.

**Sign-out:** Idle Page > Sign Out clears encrypted token, all local step/screenshot data, and returns to auth page.

**Backend changes required:**
- `POST /api/v1/auth/exchange` — new endpoint that accepts a code and returns a token
- `GET /auth/desktop_callback` — generates code (not token), redirects to `instruo://auth?code=xxx&state=yyy`
- Code storage: short-lived record in Redis or DB with 60-second TTL

### Deep Link Protocol

```typescript
// Handle both cold start and warm start on Windows
if (process.defaultApp) {
  app.setAsDefaultProtocolClient('instruo', process.execPath, [path.resolve(process.argv[1])])
} else {
  app.setAsDefaultProtocolClient('instruo')
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) { app.quit(); return }

// Warm start: URL comes via second-instance event
app.on('second-instance', (_event, commandLine) => {
  const url = commandLine.find(arg => arg.startsWith('instruo://'))
  if (url) handleDeepLink(url)
  if (mainWindow?.isMinimized()) mainWindow.restore()
  mainWindow?.focus()
})

// Cold start: URL comes via process.argv
app.whenReady().then(() => {
  const url = process.argv.find(arg => arg.startsWith('instruo://'))
  if (url) handleDeepLink(url)
})
```

### System Tray

**Icon states:**
- Idle (gray/default) — "Instruo Desktop"
- Recording (green/animated) — "Recording... {n} steps"
- Paused (yellow) — "Recording paused"

**Context menus:**
- Idle: "Start Recording" | "Open Instruo" | "Quit"
- Recording: "Stop Recording" | "Pause" | separator | "Cancel Recording"
- Paused: "Resume Recording" | "Stop Recording" | separator | "Cancel Recording"

### Auto-Update

```yaml
# electron-builder.yml
publish:
  provider: generic
  url: https://releases.instruo.ai/desktop
```

- Check for updates on launch (after 5-second delay)
- **Never interrupt active recording** with update notifications
- User-initiated download (not auto-download)
- Install on quit (`autoInstallOnAppQuit: true`)

### Typed Error Strategy (from TypeScript review)

```typescript
// src/shared/errors.ts
type AppError =
  | { code: 'AUTH_EXPIRED'; message: string }
  | { code: 'AUTH_INVALID_STATE'; message: string }
  | { code: 'PLAN_LIMIT_REACHED'; currentCount: number; maxCount: number }
  | { code: 'UIA_TIMEOUT'; x: number; y: number }
  | { code: 'SCREENSHOT_FAILED'; displayId: string; message: string }
  | { code: 'UPLOAD_FAILED'; stepIndex: number; httpStatus: number; message: string }
  | { code: 'NETWORK_ERROR'; message: string }

type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E }
```

### LGPD Compliance (from Security review — CRITICAL for Brazilian market)

- **Pre-recording warning:** Display a prominent dialog before the first recording explaining that screenshots capture all visible content (including personal data of third parties). Require "I understand" acknowledgment. Store acknowledgment in electron-store (don't ask again).
- **Redaction tool in Review page:** Allow users to blur/black-out sensitive areas of screenshots before upload. Simple rectangle-select → blur approach.
- **Local data cleanup:** Delete temp screenshots and session data after successful upload. Crash recovery data auto-expires after 24 hours.
- **Privacy policy link:** Include in idle page footer and sign-in page. Links to instruo.ai/privacy.
- **Data minimization:** Only capture what's needed — step metadata + screenshot. Don't log typed values to disk (only in-memory during recording).

### Multi-Monitor Support

- `screen.getAllDisplays()` lists all monitors with bounds and scale factors
- On click at `(x, y)`, find which display contains those coordinates
- Capture only that display via `desktopCapturer` source matching `display_id`
- Handle DPI scaling: `uiohook-napi` returns logical pixels, `elementFromPoint` expects logical pixels — consistent on Windows

### Crash Recovery

Steps are persisted to a temp file (`electron-store` with name `recording-session`) incrementally during recording and review:
- On crash/force-quit → on next launch, detect incomplete session
- Offer to resume review or discard
- Clean up temp file after successful upload or explicit discard

### Per-Step Timing Budget (from Performance Review)

| Stage | Duration | Notes |
|-------|----------|-------|
| Event capture + state guard + self-click filter | < 1ms | In-memory checks |
| **Screenshot capture (IMMEDIATE, outside queue)** | 50-100ms | `NativeImage.toJPEG(80)` |
| Double-click check | < 1ms | Compare with last click |
| Flush pending typing session | < 1ms | Synchronous null-guard |
| UIA query (worker thread) | 5-50ms typical, 1000ms timeout | Non-blocking via worker |
| Parent hierarchy walk | 10-40ms | Included in worker |
| Title generation | < 1ms | String operations |
| Screenshot annotation (sharp) | 30-80ms | Pre-generated circle overlay |
| Write JPEG to temp file | 5-15ms | Async, ~300KB |
| Session metadata persist | 1-5ms | Debounced 1/sec, JSONL append |
| IPC notification | < 1ms | Fire-and-forget |
| **Total (typical)** | **~100-240ms** | Well within 500ms target |
| **Total (worst case, UIA timeout)** | **~1100ms** | Fallback title used at 1000ms |

### Deployment Configuration (from Deployment Review)

**electron-builder.yml (critical fields):**
```yaml
appId: ai.instruo.desktop
productName: Instruo

asar: true
asarUnpack:                              # MANDATORY for native modules
  - "node_modules/uiohook-napi/**"
  - "node_modules/node-winautomation/**"
  - "**/*.node"

npmRebuild: true
nativeRebuilder: sequential              # Safer on Windows (avoids file locks)

protocols:
  - name: instruo-protocol
    schemes:
      - instruo

win:
  target:
    - target: nsis
      arch: [x64]
  signingHashAlgorithms: [sha256]

nsis:
  oneClick: true                         # Simple install for Brazilian SMB users
  perMachine: false                      # Current user only, no UAC prompt
  deleteAppDataOnUninstall: true         # Clean up tokens and local data

publish:
  provider: generic
  url: https://releases.instruo.ai/desktop
```

**package.json scripts:**
```json
{
  "postinstall": "electron-builder install-app-deps",
  "dev": "electron-vite dev",
  "build": "electron-vite build",
  "package": "electron-vite build && electron-builder --win --x64",
  "package:dir": "electron-vite build && electron-builder --dir"
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Electron shell with auth, basic UI, and project infrastructure.

**Tasks:**

- [ ] **Scaffold project** with `npm create @quick-start/electron -- --template react-ts`
  - Configure `electron.vite.config.ts` with native module externalization
  - Configure `electron-builder.yml` for Windows NSIS + `instruo://` protocol
  - Set up Tailwind CSS with Instruo dark theme design tokens
  - `src/shared/ipc-channels.ts`, `src/shared/types.ts`, `src/shared/constants.ts`

- [ ] **Auth flow**
  - `src/main/deep-link.ts` — protocol registration, single instance lock, URL parsing, state validation
  - `src/main/auth-manager.ts` — token storage with `safeStorage` encryption, sign-out
  - `src/renderer/src/pages/AuthPage.tsx` — sign in button, loading state
  - `src/preload/index.ts` — contextBridge with typed API

- [ ] **Basic window + tray**
  - `src/main/index.ts` — BrowserWindow with security config, app lifecycle
  - `src/main/tray-manager.ts` — idle state tray icon + context menu
  - `src/renderer/src/App.tsx` — router (auth → idle → review → upload → success)

- [ ] **API client**
  - `src/main/api-client.ts` — ported from `instruo-chrome/lib/api-client.js` to TypeScript
  - Token verification via `GET /api/v1/usage` on launch
  - AuthError handling (401 → clear token → auth page)

- [ ] **i18n**
  - `src/renderer/src/i18n/` — PT-BR + EN translations, `t()` function, locale detection
  - Ported from `instruo-chrome/lib/i18n.js` pattern

**Deliverable:** App launches, user can sign in via browser, idle page shows user info from `/api/v1/usage`.

### Phase 2: Recording Engine (Week 3-5)

**Goal:** Core recording loop — capture clicks, screenshots, and element metadata.

**Tasks:**

- [ ] **Global hooks**
  - `src/main/global-hooks.ts` — `uiohook-napi` setup, start/stop, event filtering
  - Self-click filtering (ignore clicks within Instruo window bounds)
  - Left-click and right-click capture, double-click detection (500ms threshold)

- [ ] **Screenshot capture**
  - `src/main/screenshot-capture.ts` — `desktopCapturer` wrapper
  - Multi-monitor: detect which display contains click `(x, y)`
  - Output: JPEG buffer at 80% quality via `NativeImage.toJPEG(80)`
  - Max dimension downscaling (1920px)

- [ ] **Element detection**
  - `src/main/element-detector.ts` — `node-winautomation` wrapper
  - `elementFromPoint(x, y)` → element properties
  - Parent hierarchy walking via `controlViewWalker`
  - 4-layer priority title generation (patterns → types → parents → fallback)
  - Password detection via `currentIsPassword`
  - `electron-rebuild -f -w node-winautomation`

- [ ] **Screenshot annotation**
  - `src/main/screenshot-annotator.ts` — red click circle on JPEG buffer
  - Constants: radius 14, red fill rgba(239,68,68,0.35), stroke #ef4444, white outer ring
  - Ported from `instruo-chrome/lib/annotate.js`

- [ ] **Recording engine**
  - `src/main/recording-engine.ts` — state machine (IDLE → RECORDING ↔ PAUSED → REVIEW)
  - `src/main/capture-pipeline.ts` — per-click orchestration (screenshot→UIA→annotate→store)
  - `src/main/step-store.ts` — in-memory collection + JSONL persistence + crash recovery
  - Capture queue (serialized async, ported from Chrome extension)
  - Keystroke debouncing (300ms), merge with previous click step
  - Keyboard shortcut detection (modifier + key → "Pressed Ctrl+S")
  - 40-step limit with auto-stop notification
  - Crash recovery: persist steps to `electron-store` incrementally

- [ ] **Hotkey manager**
  - `src/main/hotkey-manager.ts` — `globalShortcut.register('CommandOrControl+Shift+R')`
  - Toggle: idle → start, recording → stop, paused → resume

- [ ] **Tray updates for recording**
  - Recording/paused tray icon states
  - Context menu: Stop, Pause/Resume, Cancel
  - Tooltip with step count

- [ ] **Countdown overlay**
  - 3-2-1 countdown shown in the main window before minimizing to tray (Esc to cancel)
  - Auto-dismiss, then minimize main window to tray

**Deliverable:** User can start/stop recording, clicks produce steps with screenshots and element titles, steps persist locally.

### Phase 3: Review & Upload (Week 6-7)

**Goal:** Step review page and upload to instruo-app.

**Tasks:**

- [ ] **Review page**
  - `src/renderer/src/pages/ReviewPage.tsx`
  - Step list with thumbnails, editable titles (textarea), delete, up/down reorder
  - Screenshot lightbox (full-size view on click)
  - Guide metadata: title input, AI writer selector, guide type toggle, team selector
  - Empty state (zero steps) with message
  - "Discard" button with confirmation dialog
  - Unsaved changes warning on window close

- [ ] **Pre-upload validation**
  - Check plan limits via `/api/v1/usage` before starting upload
  - If at limit → show upgrade prompt, do not proceed

- [ ] **Upload flow (main process orchestration)**
  - `src/main/api-client.ts` drives the upload loop (not the renderer)
  - Renderer calls `guide:upload-all` IPC invoke with guide metadata
  - Main process: creates guide (`POST /api/v1/guides` with `source: 'desktop'`), reads screenshots from temp files, uploads steps sequentially with per-step retry (3 attempts, exponential backoff), includes step UUID as idempotency key
  - Main process sends `upload:progress`, `upload:error`, `upload:complete` events to renderer
  - `src/renderer/src/pages/UploadPage.tsx` displays progress bar and step checkmarks
  - 401 handling → preserve local data, redirect to auth, offer resume after re-auth

- [ ] **Success state**
  - Shown in UploadPage after `upload:complete` event
  - Link to guide on instruo.ai, "Record another" button
  - Clean up local step data + temp screenshots

**Deliverable:** Full end-to-end flow — record, review, edit, upload, view guide on instruo.ai.

### Phase 4: Polish & Distribution (Week 8-9)

**Goal:** Production-ready packaging, auto-updates, code signing.

**Tasks:**

- [ ] **Auto-updates**
  - `src/main/update-manager.ts` — `electron-updater` with generic provider
  - Check on launch (5s delay), notify user, download on request, install on quit
  - Never interrupt active recording

- [ ] **Windows installer**
  - NSIS installer via `electron-builder`
  - Protocol registration (`instruo://`)
  - Uninstaller cleanup
  - App icon (multi-size ICO)

- [ ] **Code signing**
  - Obtain EV code signing certificate (~$249/year from SSL.com)
  - Configure `WIN_CSC_LINK` and signing in CI
  - SmartScreen reputation builds over time (no instant bypass)

- [ ] **Release pipeline**
  - Build script: `electron-vite build && electron-builder`
  - Upload `.exe` + `latest.yml` to `releases.instruo.ai/desktop/`
  - Version bump workflow

- [ ] **Error handling & logging**
  - `electron-log` for file + console logging
  - Structured error reporting for UIA failures, screenshot failures, upload failures
  - User-facing error messages (i18n)

- [ ] **Antivirus testing**
  - Test signed installer against Windows Defender, Avast, Kaspersky
  - Document false positive remediation steps
  - FAQ page for antivirus issues

- [ ] **Edge case handling**
  - UAC prompt detection (hook failures → pause recording, notify user)
  - Lock screen / sleep → auto-pause recording, resume on unlock
  - Single-instance enforcement via `requestSingleInstanceLock()`

**Deliverable:** Signed `.exe` installer downloadable from instruo.ai, auto-updates working.

### Phase 5: Backend Changes (instruo-app) — Parallel with Phase 1-2

**Goal:** Backend support for the desktop client.

**Tasks:**

- [ ] **Guide source enum**
  - Add `desktop: 2` to `Guide.source` enum in `app/models/guide.rb`
  - Update `Guide#all_steps_uploaded?` to include `source_desktop?`
  - Update any source-specific logic (analytics, filtering)

- [ ] **Desktop auth callback**
  - New route: `GET /auth/desktop_callback`
  - New concern: `DesktopRedirectable` (or extend `ExtensionRedirectable`)
  - Modify `SessionsController`: handle `from=desktop` + `state` parameter
  - Modify `OmniauthCallbacksController`: handle desktop redirect for Google OAuth
  - Redirect page that triggers `instruo://auth?code=xxx&state=yyy` (authorization code, not raw token)
  - New endpoint: `POST /api/v1/auth/exchange` — accepts code, returns bearer token (code expires in 60s, single-use)

- [ ] **State parameter validation**
  - Store `state` in session on login page load
  - Validate `state` matches on callback before issuing token

**Deliverable:** Backend accepts `source: 'desktop'` guides, desktop auth flow works end-to-end.

## Alternative Approaches Considered

(see brainstorm: Rejected Alternatives)

| Alternative | Why Rejected |
|-------------|-------------|
| **Tauri (Rust)** | Smaller app but requires Rust. No established Accessibility API bindings. |
| **Native per-platform (Swift + C#)** | Best OS integration but double maintenance. |
| **OCR-only detection** | Less precise, no structured element data. |
| **In-app login form** | 2x more work vs. browser redirect. Must reimplement OAuth, CAPTCHA, etc. |
| **C# helper for UIA** | More durable .NET bindings but adds C# to stack + 50ms IPC overhead per call. |
| **iohook** | Deprecated (2021), breaks with each Electron version. |
| **Electron Forge** | Less flexible auto-update (no generic provider) vs. electron-builder. |

## System-Wide Impact

### Interaction Graph

- **Recording start** → `uiohook.start()` → global hooks active → `mousedown` → `elementFromPoint()` + `desktopCapturer` → step stored → IPC to renderer (step count)
- **Recording stop** → `uiohook.stop()` → hooks deactivated → IPC `recording:status-changed` → renderer navigates to review page
- **Guide upload** → `POST /api/v1/guides` → sequential `POST /steps` → on last step, backend triggers `AutoPolishJob` if enabled → AI rewrites titles

### Error Propagation

- **UIA failure** (`elementFromPoint` returns null/throws) → fallback title "Click on [Window Title]" → step still created with screenshot → no user-visible error
- **Screenshot failure** (display not found, permission denied) → step skipped → user notification "Step could not be captured"
- **Auth failure** (401 on any API call) → clear token → navigate to auth page → user re-authenticates
- **Upload failure** (network error) → retry 3x with backoff → if still failing, pause upload → user sees "Retry" button → can resume from failed step

### State Lifecycle Risks

- **Crash during recording** → steps persisted incrementally to disk → on restart, offer to resume review
- **Crash during upload** → guide may exist on backend without all steps → upload resume uses `startIndex` to continue. Empty guides cleaned by backend's existing orphan cleanup.
- **Token in memory after sign-out** → `auth-manager.signOut()` explicitly clears encrypted store + in-memory reference

### API Surface Parity

Backend changes are minimal — only `source: 'desktop'` enum value and `/auth/desktop_callback` route. All existing API endpoints (`/guides`, `/steps`, `/usage`, `/teams`) work identically for desktop and extension clients. The `source` field is the only differentiator.

## Acceptance Criteria

### Functional Requirements

- [ ] User can sign in via browser redirect and deep link
- [ ] User can start/stop recording via button or Ctrl+Shift+R
- [ ] App minimizes to system tray during recording with status icon
- [ ] Each left-click on a desktop app produces a step with screenshot + element title
- [ ] Right-clicks are captured as "Right-click on [element]" steps
- [ ] Double-clicks are consolidated into single "Double-click on [element]" steps
- [ ] Keystrokes in text fields are debounced and merged into step descriptions
- [ ] Password fields are masked ("••••") in step descriptions
- [ ] Keyboard shortcuts (Ctrl+S, etc.) are captured as separate steps
- [ ] Screenshots show red click indicator at the click position
- [ ] 40-step limit auto-stops recording with user notification
- [ ] Review page allows editing titles, deleting steps, reordering (up/down buttons)
- [ ] User can set guide title, AI writer, guide type, and team before upload
- [ ] Upload shows progress bar and handles failures with retry
- [ ] Pre-upload validation checks plan limits
- [ ] Guide appears on instruo.ai after successful upload
- [ ] App auto-checks for updates and allows user-initiated download/install
- [ ] Sign out clears all local data and returns to auth page
- [ ] UI supports PT-BR and EN

### Non-Functional Requirements

- [ ] Screenshot capture latency < 200ms per step (JPEG @ 80%)
- [ ] UIA element query < 100ms per click
- [ ] Total per-step processing < 500ms (capture + query + annotate + store)
- [ ] Crash recovery: no data loss for completed steps
- [ ] Token encrypted at rest via Windows DPAPI (safeStorage)
- [ ] No `nodeIntegration`, sandboxed renderer, CSP enforced

### Quality Gates

- [ ] All main process modules have unit tests
- [ ] IPC contract tested (type-safe channels verified)
- [ ] Recording engine state machine tested (all transitions)
- [ ] Element detector tested with mock UIA responses
- [ ] API client tested (success, 401, network error)
- [ ] Manual testing on Windows 10 and Windows 11
- [ ] Installer tested: fresh install, upgrade, uninstall
- [ ] Signed installer passes Windows Defender scan

## Dependencies & Prerequisites

### Backend (instruo-app) — Must be done before Phase 3

- Add `desktop: 2` to `Guide.source` enum
- Add `/auth/desktop_callback` route with state parameter validation
- Update `all_steps_uploaded?` to include desktop source
- Modify `SessionsController` and `OmniauthCallbacksController` for `from=desktop`

### Infrastructure

- S3 bucket or web server at `releases.instruo.ai/desktop/` for hosting installers + `latest.yml`
- EV code signing certificate ($249/year from SSL.com)

### External Dependencies

- `node-winautomation` — new library (Feb 2026), low adoption. Mitigation: MIT license, fork if abandoned.
- `uiohook-napi` — stable, 8k weekly downloads. Low risk.

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `node-winautomation` is buggy/abandoned | Medium | High | Fork and maintain (MIT, N-API = stable ABI). Or build ~500-line custom C++ addon. |
| Antivirus flags global hooks as keylogger | Medium | High | EV code signing, SmartScreen reputation, user FAQ, antivirus vendor whitelisting |
| UIA returns poor data for common apps | Medium | Medium | Test top 10 target apps early. AI vision fallback as future differentiator. |
| desktopCapturer performance too slow | Low | High | Use `NativeImage.toJPEG(80)` (~90ms). Fall back to `toBitmap()` + sharp for JPEG. |
| Deep link hijacking (protocol conflict) | Low | High | State parameter validation (CSRF), single instance lock |
| COM threading issues with UIA | Medium | Medium | Test early. If needed, move UIA queries to a worker thread via `worker_threads`. |

## Success Metrics

- Users can record and upload desktop guides end-to-end
- Step titles are accurate for mainstream Windows apps (Office, Explorer, browsers, Slack)
- Upload success rate > 95% (accounting for network retries)
- Time from "Start Recording" to first step capture < 1 second
- App passes Windows Defender and SmartScreen without blocking

## Documentation Plan

- [ ] CLAUDE.md for instruo-electron repo (coding conventions, dev setup, test commands)
- [ ] Landing page update: add desktop app download section
- [ ] In-app onboarding: brief tooltip explaining recording controls on first use

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-24-desktop-app-brainstorm.md](docs/brainstorms/2026-03-24-desktop-app-brainstorm.md) — Key decisions carried forward: Windows first, Electron + TypeScript + React, Accessibility API only for MVP, `uiohook-napi` + `node-winautomation`, system tray + global hotkey UX, browser redirect auth, available on all plans

### Internal References

- Chrome extension recording engine: `/Users/aneziocampos/Projects/instruo-chrome/background/service-worker.js` (state machine, capture queue)
- Chrome extension element detection: `/Users/aneziocampos/Projects/instruo-chrome/content/detector.js` (4-layer priority, typing sessions)
- Chrome extension API client: `/Users/aneziocampos/Projects/instruo-chrome/lib/api-client.js` (endpoints, auth, upload)
- Chrome extension annotation: `/Users/aneziocampos/Projects/instruo-chrome/lib/annotate.js` (red circle constants)
- Chrome extension i18n: `/Users/aneziocampos/Projects/instruo-chrome/lib/i18n.js` (PT-BR/EN, `t()`)
- Chrome extension element descriptor: `/Users/aneziocampos/Projects/instruo-chrome/lib/element-descriptor.js` (title generation)
- Backend auth flow: `/Users/aneziocampos/Projects/instruo-app/app/controllers/concerns/extension_redirectable.rb`
- Backend guide model: `/Users/aneziocampos/Projects/instruo-app/app/models/guide.rb` (source enum, `all_steps_uploaded?`)
- Backend API routes: `/Users/aneziocampos/Projects/instruo-app/config/routes.rb`

### External References

- [Electron Official Docs — Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron Official Docs — Deep Links](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app)
- [Electron Official Docs — desktopCapturer](https://www.electronjs.org/docs/latest/api/desktop-capturer)
- [Electron Official Docs — Tray](https://www.electronjs.org/docs/latest/api/tray)
- [Electron Official Docs — globalShortcut](https://www.electronjs.org/docs/latest/api/global-shortcut)
- [electron-vite Documentation](https://electron-vite.org/)
- [electron-builder Auto Update](https://www.electron.build/auto-update.html)
- [uiohook-napi GitHub](https://github.com/SnosMe/uiohook-napi)
- [node-winautomation GitHub](https://github.com/SrikanthVemulapally/node-winautomation)
- [Scribe Desktop FAQ](https://support.scribehow.com/hc/en-us/articles/11865867639581)

### Related Chrome Extension Plans

- Token redirect auth: `/Users/aneziocampos/Projects/instruo-chrome/docs/plans/2026-03-16-refactor-token-redirect-auth-plan.md`
- Full-page screenshots: `/Users/aneziocampos/Projects/instruo-chrome/docs/plans/2026-03-14-refactor-full-page-screenshots-plan.md`
- Recording progress feedback: `/Users/aneziocampos/Projects/instruo-chrome/docs/plans/2026-03-22-feat-recording-progress-feedback-plan.md`

# Instruo Desktop App

Electron desktop app for recording step-by-step guides from any Windows application.

## Quick Start

```bash
npm install
npm run dev        # Start dev server with hot reload
npm run build      # Production build
npm run typecheck  # TypeScript checking (node + web)
npm run package    # Build + package Windows installer
```

## Architecture

**Electron 41 + electron-vite 5 + React 18 + TypeScript**

- `src/main/` — Main process (Node.js): recording engine, native modules, IPC handlers, tray, auth
- `src/preload/` — Preload script: typed contextBridge (no raw ipcRenderer exposure)
- `src/renderer/` — Renderer process (React): UI pages, components, i18n
- `src/shared/` — Types shared across all processes: IPC contract, domain types, errors, constants

## Key Conventions

### IPC
- Bidirectional split: `IpcInvokeChannels` (request/response) + `IpcEventChannels` (fire-and-forget)
- ALL handlers use `secureHandle()` wrapper that validates `event.senderFrame`
- Event subscriptions return `() => void` cleanup function for React useEffect
- Channels that can fail return `Result<T>` (not throw)

### TypeScript
- `RecordingState` is a discriminated union (4 states: idle, recording, paused, review)
- `AppError` union with `Result<T, E>` for typed error handling
- `StepActionType` derived from const array (`STEP_ACTION_TYPES as const`)
- Native module types in `src/main/types/` (e.g., `node-winautomation.d.ts`)

### Recording Engine (Phase 2)
- 3-module split: `RecordingEngine` (state machine + queue), `CapturePipeline` (per-click), `StepStore` (persistence)
- Screenshots captured IMMEDIATELY on mousedown (before queue) — eager capture
- Screenshots stored as temp files on disk (NOT in-memory buffers)
- UIA queries run on a worker thread with 1-second timeout
- State guard at every event handler entry point

### Naming
- Pages: `{Noun}Page.tsx` (AuthPage, IdlePage, ReviewPage)
- Main modules: `kebab-case.ts` (recording-engine.ts, api-client.ts)
- Action types: camelCase (`rightClick`, `doubleClick`, not kebab-case)
- Locale code: `pt` (not `pt-BR`)
- API field names: match Rails snake_case in API client, camelCase in TypeScript types

### i18n
- Simple `t(key, params)` function — not a React hook
- Two locales: `pt` and `en`
- Translations in `src/renderer/src/i18n/{pt,en}.ts`
- Typed keys: `TranslationKey` type ensures compile-time safety
- All UI strings via `t()` — never hardcoded

### Security
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- CSP enforced via session headers
- `shell.openExternal` URL allowlist (HTTPS only, instruo.ai domains)
- Auth: authorization code exchange (not raw token in deep link)
- Token encrypted via `safeStorage` (Windows DPAPI)

### Design
- Dark theme only: `#0d1117` bg, `#22c55e` accent, DM Sans + Syne fonts
- Tailwind CSS with custom color tokens (see `tailwind.config.js`)
- Window sizes: Auth 400×500, Idle 420×600, Review 1000×700

## Dependencies

| Package | Purpose |
|---------|---------|
| electron-vite | Build tooling (unified config for main/preload/renderer) |
| electron-builder | Windows NSIS installer + auto-update |
| electron-store | Typed JSON persistence + safeStorage for tokens |
| electron-log | File + console logging |
| uiohook-napi | Global mouse/keyboard hooks (Phase 2) |
| node-winautomation | Windows UI Automation COM bindings (Phase 2) |

## Plan

See `docs/plans/2026-03-24-feat-instruo-desktop-app-plan.md` for the full implementation plan.

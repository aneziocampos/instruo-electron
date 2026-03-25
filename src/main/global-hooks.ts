import log from 'electron-log'
import * as recordingEngine from './recording-engine'
import { captureScreenshot } from './screenshot-capture'
import { annotateAndSave } from './screenshot-annotator'
import { getMainWindow } from './index'

// uiohook-napi is lazy-loaded to avoid startup cost
let uiohook: typeof import('uiohook-napi') | null = null
let isHookActive = false

function getHook(): typeof import('uiohook-napi') {
  if (!uiohook) {
    uiohook = require('uiohook-napi')
  }
  return uiohook!
}

// --- Start / Stop ---

export function startHooks(): void {
  if (isHookActive) return

  const { uIOhook } = getHook()

  uIOhook.on('mousedown', handleMouseDown)
  uIOhook.on('keydown', handleKeyDown)
  uIOhook.start()
  isHookActive = true
  log.info('Global hooks started')
}

export function stopHooks(): void {
  if (!isHookActive) return

  const { uIOhook } = getHook()
  uIOhook.stop()
  uIOhook.removeAllListeners()
  isHookActive = false
  log.info('Global hooks stopped')
}

// --- Mouse Handler ---

function handleMouseDown(event: { x: number; y: number; button: number }): void {
  // State guard
  if (!recordingEngine.isRecording()) return

  // Filter: only left (1) and right (3) clicks on macOS
  // uiohook-napi: button 1 = left, 2 = right, 3 = middle
  const button = event.button === 1 ? 'left' as const :
                 event.button === 2 ? 'right' as const : null
  if (!button) return

  // Filter self-clicks (on Instruo window)
  if (isSelfClick(event.x, event.y)) return

  // EAGER screenshot capture (before queuing)
  captureScreenshot(event.x, event.y)
    .then(async (screenshot) => {
      let screenshotPath: string | null = null
      let screenInfo = { width: 1920, height: 1080, displayId: '0' }

      if (screenshot) {
        // Annotate and save to disk
        const stepId = crypto.randomUUID()
        screenshotPath = await annotateAndSave(
          screenshot.buffer,
          event.x,
          event.y,
          stepId
        )
        screenInfo = {
          width: screenshot.width,
          height: screenshot.height,
          displayId: screenshot.displayId
        }
      }

      // Enqueue the rest of the processing
      recordingEngine.enqueueClick(
        event.x,
        event.y,
        button,
        screenshot?.buffer ?? null,
        screenshotPath,
        screenInfo
      )
    })
    .catch((error) => {
      log.error('Screenshot capture error:', error)
    })
}

// --- Keyboard Handler ---

function handleKeyDown(event: {
  keycode: number
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}): void {
  if (!recordingEngine.isRecording()) return

  // TODO Phase 2B: implement keystroke debouncing + merge with previous click step
  // TODO Phase 2B: detect keyboard shortcuts (modifier + key)
  // For now, just log
  if (event.ctrlKey || event.metaKey || event.altKey) {
    // Keyboard shortcut detected — will be implemented in Phase 2B
  }
}

// --- Helpers ---

function isSelfClick(x: number, y: number): boolean {
  const mainWindow = getMainWindow()
  if (!mainWindow || mainWindow.isMinimized() || !mainWindow.isVisible()) return false

  const bounds = mainWindow.getBounds()
  return (
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height
  )
}

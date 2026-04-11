import log from 'electron-log'
import * as recordingEngine from './recording-engine'
import { captureScreenshot } from './screenshot-capture'
import { annotateAndSave } from './screenshot-annotator'
import { getMainWindow } from './index'

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

  try {
    const { uIOhook } = getHook()
    uIOhook.on('mousedown', handleMouseDown)
    uIOhook.start()
    isHookActive = true
    log.info('Global hooks started')
  } catch (error) {
    log.error('Failed to start global hooks:', error)
  }
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
  if (!recordingEngine.isRecording()) return

  // uiohook-napi macOS: button 1 = left, 2 = right, 3 = middle
  const button = event.button === 1 ? 'left' as const :
                 event.button === 2 ? 'right' as const : null
  if (!button) return

  if (isSelfClick(event.x, event.y)) return

  // EAGER screenshot capture (before queuing)
  captureScreenshot(event.x, event.y)
    .then(async (screenshot) => {
      let screenshotPath: string | null = null
      let screenInfo = { width: 1920, height: 1080, displayId: '0' }

      if (screenshot) {
        const stepId = crypto.randomUUID()
        screenshotPath = await annotateAndSave(
          screenshot.buffer,
          event.x,
          event.y,
          stepId,
          screenshot.width,
          screenshot.height
        )
        screenInfo = {
          width: screenshot.width,
          height: screenshot.height,
          displayId: screenshot.displayId
        }
      }

      // P2: Removed unused screenshotBuffer from call chain
      recordingEngine.enqueueClick(
        event.x,
        event.y,
        button,
        screenshotPath,
        screenInfo
      )
    })
    .catch((error) => {
      log.error('Screenshot capture error:', error)
    })
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

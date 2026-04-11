import { globalShortcut, app } from 'electron'
import log from 'electron-log'
import { HOTKEY } from '../shared/constants'
import * as recordingEngine from './recording-engine'
import { startHooks, stopHooks } from './global-hooks'
import { getMainWindow, resizeWindow } from './index'
import { setRecordingMenu, setPausedMenu, setIdleMenu } from './tray-manager'

export function registerHotkey(): void {
  app.whenReady().then(() => {
    const registered = globalShortcut.register(HOTKEY, handleHotkey)
    if (!registered) {
      log.warn(`Failed to register global shortcut: ${HOTKEY}`)
    } else {
      log.info(`Global shortcut registered: ${HOTKEY}`)
    }
  })

  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })
}

function handleHotkey(): void {
  const state = recordingEngine.getState()

  switch (state.status) {
    case 'idle':
      startRecording()
      break
    case 'recording':
      stopRecording()
      break
    case 'paused':
      resumeRecording()
      break
    case 'review':
      // Hotkey does nothing during review
      break
  }
}

export function startRecording(): void {
  recordingEngine.start()
  const hooksStarted = startHooks()

  if (!hooksStarted) {
    // Hooks failed (macOS dev mode or missing permissions) — cancel and show window
    recordingEngine.cancel()
    const mainWindow = getMainWindow()
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('recording:hooks-failed')
    }
    return
  }

  setRecordingMenu(0)

  // Minimize to tray
  const mainWindow = getMainWindow()
  if (mainWindow) {
    mainWindow.hide()
  }
}

export async function stopRecording(): Promise<void> {
  stopHooks()
  await recordingEngine.stop()
  setIdleMenu()

  // Show window with review
  const mainWindow = getMainWindow()
  if (mainWindow) {
    resizeWindow(1000, 700, true)
    mainWindow.show()
    mainWindow.focus()
  }
}

export function pauseRecording(): void {
  stopHooks()
  recordingEngine.pause()
  const state = recordingEngine.getState()
  if (state.status === 'paused') {
    setPausedMenu(state.stepCount)
  }
}

export function resumeRecording(): void {
  recordingEngine.resume()
  startHooks()
  const state = recordingEngine.getState()
  if (state.status === 'recording') {
    setRecordingMenu(state.stepCount)
  }
}

export function cancelRecording(): void {
  stopHooks()
  recordingEngine.cancel()
  setIdleMenu()

  const mainWindow = getMainWindow()
  if (mainWindow) {
    resizeWindow(420, 600, false)
    mainWindow.show()
    mainWindow.focus()
  }
}

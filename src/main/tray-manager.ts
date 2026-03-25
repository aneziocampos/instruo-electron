import { Tray, Menu, nativeImage, app } from 'electron'
import { getMainWindow } from './index'

let tray: Tray | null = null

// Lazy references to hotkey-manager to avoid circular imports at module load
let hotkeyManager: typeof import('./hotkey-manager') | null = null
function getHotkeyManager(): typeof import('./hotkey-manager') {
  if (!hotkeyManager) {
    hotkeyManager = require('./hotkey-manager')
  }
  return hotkeyManager!
}

function showMainWindow(): void {
  const mainWindow = getMainWindow()
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

export function createTray(): void {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('Instruo Desktop')
  setIdleMenu()

  tray.on('double-click', () => {
    showMainWindow()
  })
}

export function setIdleMenu(): void {
  if (!tray) return
  tray.setToolTip('Instruo Desktop')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Instruo', click: showMainWindow },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])
  )
}

export function setRecordingMenu(stepCount: number): void {
  if (!tray) return
  tray.setToolTip(`Recording — ${stepCount} steps`)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: `Stop Recording (${stepCount} steps)`,
        click: () => getHotkeyManager().stopRecording()
      },
      {
        label: 'Pause Recording',
        click: () => getHotkeyManager().pauseRecording()
      },
      { type: 'separator' },
      {
        label: 'Cancel Recording',
        click: () => getHotkeyManager().cancelRecording()
      }
    ])
  )
}

export function setPausedMenu(stepCount: number): void {
  if (!tray) return
  tray.setToolTip(`Recording paused — ${stepCount} steps`)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Resume Recording',
        click: () => {
          require('./recording-engine').resume()
          require('./global-hooks').startHooks()
          setRecordingMenu(stepCount)
        }
      },
      {
        label: `Stop Recording (${stepCount} steps)`,
        click: () => getHotkeyManager().stopRecording()
      },
      { type: 'separator' },
      {
        label: 'Cancel Recording',
        click: () => getHotkeyManager().cancelRecording()
      }
    ])
  )
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}

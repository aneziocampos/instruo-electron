import { Tray, Menu, nativeImage, app } from 'electron'
import { getMainWindow } from './index'

let tray: Tray | null = null

function showMainWindow(): void {
  const mainWindow = getMainWindow()
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

export function createTray(): void {
  // Use a simple 16x16 placeholder icon — real icons will be designed later
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
      { label: `Stop Recording (${stepCount} steps)`, click: () => { /* TODO: recording:stop */ } },
      { label: 'Pause Recording', click: () => { /* TODO: recording:pause */ } },
      { type: 'separator' },
      { label: 'Cancel Recording', click: () => { /* TODO: recording:cancel */ } }
    ])
  )
}

export function setPausedMenu(stepCount: number): void {
  if (!tray) return
  tray.setToolTip(`Recording paused — ${stepCount} steps`)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Resume Recording', click: () => { /* TODO: recording:resume */ } },
      { label: `Stop Recording (${stepCount} steps)`, click: () => { /* TODO: recording:stop */ } },
      { type: 'separator' },
      { label: 'Cancel Recording', click: () => { /* TODO: recording:cancel */ } }
    ])
  )
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}

import { app, BrowserWindow, session, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { PROTOCOL, PROTOCOL_PREFIX, ALLOWED_EXTERNAL_HOSTS } from '../shared/constants'
import { registerIpcHandlers } from './ipc-handlers'
import { handleDeepLink } from './deep-link'
import { createTray } from './tray-manager'
import { registerHotkey } from './hotkey-manager'

let mainWindow: BrowserWindow | null = null

// --- Single Instance Lock ---
// On Windows, deep links launch a new process. We must forward the URL to the existing instance.
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    const url = commandLine.find((arg) => arg.startsWith(PROTOCOL_PREFIX))
    if (url) {
      handleDeepLink(url)
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// --- Protocol Registration ---
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
      join(process.argv[1])
    ])
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL)
}

// --- Window Creation ---
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 500,
    minWidth: 380,
    minHeight: 480,
    show: false,
    resizable: false,
    backgroundColor: '#0d1117',
    titleBarStyle: 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
      navigateOnDragDrop: false,
      allowRunningInsecureContent: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) return
    if (is.dev && url.startsWith('http://localhost:')) return
    event.preventDefault()
  })

  // Block new windows — open allowed external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// --- CSP Headers ---
function setupCSP(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://app.instruo.ai; font-src 'self'; object-src 'none'; form-action 'none'"
        ]
      }
    })
  })
}

// --- URL Validation ---
function isAllowedExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && ALLOWED_EXTERNAL_HOSTS.includes(parsed.hostname)
  } catch {
    return false
  }
}

// --- Window Resize Helper ---
export function resizeWindow(width: number, height: number, resizable = false): void {
  if (!mainWindow) return
  mainWindow.setResizable(true)
  mainWindow.setSize(width, height, true)
  mainWindow.center()
  mainWindow.setResizable(resizable)
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

// --- App Lifecycle ---
app.whenReady().then(() => {
  setupCSP()
  registerIpcHandlers()
  registerHotkey()
  createTray()
  createWindow()

  // Handle cold-start deep link (URL in process.argv)
  const deepLinkUrl = process.argv.find((arg) => arg.startsWith(PROTOCOL_PREFIX))
  if (deepLinkUrl) {
    handleDeepLink(deepLinkUrl)
  }
})

// macOS: deep links arrive via open-url event (not second-instance)
app.on('open-url', (_event, url) => {
  if (url.startsWith(PROTOCOL_PREFIX)) {
    handleDeepLink(url)
  }
  // Focus the window when a deep link arrives
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
})

// Flush step store on quit to prevent data loss from debounce gap
app.on('will-quit', (event) => {
  const stepStore = require('./step-store')
  if (stepStore.getStepCount() > 0) {
    event.preventDefault()
    stepStore.flush().finally(() => app.exit(0))
  }
})

app.on('window-all-closed', () => {
  app.quit()
})

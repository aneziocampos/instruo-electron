import { ipcMain, shell, systemPreferences, desktopCapturer, WebFrameMain } from 'electron'
import { is } from '@electron-toolkit/utils'
import log from 'electron-log'
import { ALLOWED_EXTERNAL_HOSTS, APP_BASE_URL } from '../shared/constants'
import { ok, err } from '../shared/errors'
import type { InvokeChannel, IpcInvokeChannels } from '../shared/ipc-channels'
import * as authManager from './auth-manager'
import * as apiClient from './api-client'
import * as recordingEngine from './recording-engine'
import * as stepStore from './step-store'
import { startRecording, stopRecording, pauseRecording, resumeRecording, cancelRecording } from './hotkey-manager'

// --- Secure Handler Wrapper (typed) ---

function isValidSender(frame: WebFrameMain | null): boolean {
  if (!frame) return false
  const url = frame.url
  if (url.startsWith('file://')) return true
  if (is.dev && url.startsWith('http://localhost:')) return true
  return false
}

function secureHandle<C extends InvokeChannel>(
  channel: C,
  handler: (
    event: Electron.IpcMainInvokeEvent,
    ...args: IpcInvokeChannels[C]['args']
  ) => IpcInvokeChannels[C]['return'] | Promise<IpcInvokeChannels[C]['return']>
): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isValidSender(event.senderFrame)) {
      log.warn(`Blocked IPC call on ${channel} from ${event.senderFrame?.url}`)
      throw new Error(`Unauthorized IPC call on ${channel}`)
    }
    return handler(event, ...(args as IpcInvokeChannels[C]['args']))
  })
}

// --- Register All Handlers ---

let getWin: (() => Electron.BrowserWindow | null) | null = null

export function registerIpcHandlers(getMainWindow: () => Electron.BrowserWindow | null): void {
  getWin = getMainWindow
  // Auth
  secureHandle('auth:get-token', () => {
    try {
      const token = authManager.getToken()
      return ok(token)
    } catch {
      return err({ code: 'OPERATION_FAILED', message: 'Failed to read token' })
    }
  })

  secureHandle('auth:sign-out', () => {
    authManager.signOut()
  })

  secureHandle('auth:open-login', async () => {
    const state = authManager.generateState()
    const loginUrl = `${APP_BASE_URL}/login?from=desktop&state=${state}`
    await shell.openExternal(loginUrl).catch((e) => {
      log.error('Failed to open browser for login:', e)
    })
  })

  // Recording
  secureHandle('recording:start', () => {
    startRecording()
  })

  secureHandle('recording:stop', () => {
    stopRecording()
  })

  secureHandle('recording:pause', () => {
    pauseRecording()
  })

  secureHandle('recording:resume', () => {
    resumeRecording()
  })

  secureHandle('recording:cancel', () => {
    cancelRecording()
  })

  secureHandle('recording:get-state', () => {
    return recordingEngine.getState()
  })

  secureHandle('recording:get-steps', () => {
    return recordingEngine.getStepThumbnails()
  })

  // Guide upload — apply renderer edits, then upload with progress
  secureHandle('guide:upload-all', async (_event, params) => {
    try {
      // Apply renderer-side edits (title, description, deletions, reorderings)
      const originalSteps = stepStore.getSteps()
      const steps = params.editedSteps
        .map((edit) => {
          const original = originalSteps.find((s) => s.id === edit.id)
          if (!original) return null
          return { ...original, title: edit.title, description: edit.description }
        })
        .filter((s): s is NonNullable<typeof s> => s !== null)

      const mainWindow = getWin?.()

      const result = await apiClient.uploadGuide(params, steps, (uploaded, total) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('upload:progress', uploaded, total)
        }
      })

      return ok(result)
    } catch (error) {
      return err({
        code: 'OPERATION_FAILED',
        message: error instanceof Error ? error.message : 'Upload failed'
      })
    }
  })

  // Usage
  secureHandle('usage:fetch', async () => {
    try {
      const usage = await apiClient.fetchUsage()
      return ok(usage)
    } catch (error) {
      if (error instanceof Error && error.name === 'AuthError') {
        return err({ code: 'AUTH_EXPIRED', message: error.message })
      }
      return err({
        code: 'OPERATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch usage'
      })
    }
  })

  // Utility
  secureHandle('app:open-external', (_event, url) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' || !ALLOWED_EXTERNAL_HOSTS.includes(parsed.hostname)) {
        log.warn(`Blocked shell.openExternal for: ${url}`)
        return
      }
      shell.openExternal(url).catch((e) => {
        log.error('Failed to open external URL:', e)
      })
    } catch {
      log.warn(`Invalid URL for shell.openExternal: ${url}`)
    }
  })

  // Permissions (macOS)
  secureHandle('permission:check-accessibility', () => {
    return systemPreferences.isTrustedAccessibilityClient(false)
  })

  secureHandle('permission:check-screen', () => {
    const status = systemPreferences.getMediaAccessStatus('screen')
    return status === 'granted'
  })

  secureHandle('permission:request-accessibility', () => {
    systemPreferences.isTrustedAccessibilityClient(true)
  })

  secureHandle('permission:request-screen', async () => {
    await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } })
  })
}

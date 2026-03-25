import { ipcMain, shell, WebFrameMain } from 'electron'
import log from 'electron-log'
import { ALLOWED_EXTERNAL_HOSTS, APP_BASE_URL } from '../shared/constants'
import { ok, err } from '../shared/errors'
import type { InvokeChannel, IpcInvokeChannels } from '../shared/ipc-channels'
import * as authManager from './auth-manager'
import * as apiClient from './api-client'
import * as recordingEngine from './recording-engine'
import * as stepStore from './step-store'
import { startRecording, stopRecording, pauseRecording, cancelRecording } from './hotkey-manager'

// --- Secure Handler Wrapper (typed) ---

function isValidSender(frame: WebFrameMain | null): boolean {
  if (!frame) return false
  const url = frame.url
  return url.startsWith('file://') || url.startsWith('http://localhost')
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

export function registerIpcHandlers(): void {
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

  secureHandle('recording:cancel', () => {
    cancelRecording()
  })

  secureHandle('recording:get-state', () => {
    return recordingEngine.getState()
  })

  secureHandle('recording:get-steps', () => {
    return recordingEngine.getStepThumbnails()
  })

  // Guide upload
  secureHandle('guide:upload-all', async (_event, params) => {
    try {
      const steps = stepStore.getSteps()
      const result = await apiClient.uploadGuide(params, steps)
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
}

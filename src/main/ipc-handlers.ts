import { ipcMain, shell, WebFrameMain } from 'electron'
import log from 'electron-log'
import { ALLOWED_EXTERNAL_HOSTS, APP_BASE_URL } from '../shared/constants'
import { ok, err } from '../shared/errors'
import type { RecordingState } from '../shared/types'
import * as authManager from './auth-manager'
import * as apiClient from './api-client'

// --- Secure Handler Wrapper ---

function isValidSender(frame: WebFrameMain | null): boolean {
  if (!frame) return false
  const url = frame.url
  return url.startsWith('file://') || url.startsWith('http://localhost')
}

function secureHandle(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => unknown
): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isValidSender(event.senderFrame)) {
      log.warn(`Blocked IPC call on ${channel} from ${event.senderFrame?.url}`)
      throw new Error(`Unauthorized IPC call on ${channel}`)
    }
    return handler(event, ...args)
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
      return err({ code: 'OPERATION_FAILED' as const, message: 'Failed to read token' })
    }
  })

  secureHandle('auth:sign-out', () => {
    authManager.signOut()
  })

  secureHandle('auth:open-login', () => {
    const state = authManager.generateState()
    const loginUrl = `${APP_BASE_URL}/login?from=desktop&state=${state}`
    shell.openExternal(loginUrl)
  })

  // Recording (placeholder — implemented in Phase 2)
  secureHandle('recording:start', () => {
    log.info('recording:start — not implemented yet')
  })

  secureHandle('recording:stop', () => {
    log.info('recording:stop — not implemented yet')
  })

  secureHandle('recording:pause', () => {
    log.info('recording:pause — not implemented yet')
  })

  secureHandle('recording:cancel', () => {
    log.info('recording:cancel — not implemented yet')
  })

  secureHandle('recording:get-state', (): RecordingState => {
    return { status: 'idle' }
  })

  secureHandle('recording:get-steps', () => {
    return []
  })

  // Guide upload (placeholder — full implementation in Phase 3)
  secureHandle('guide:upload-all', async (_event, ...args: unknown[]) => {
    try {
      const params = args[0] as Parameters<typeof apiClient.uploadGuide>[0]
      const steps = [] as Parameters<typeof apiClient.uploadGuide>[1] // TODO: get from step store
      const result = await apiClient.uploadGuide(params, steps)
      return ok(result)
    } catch (error) {
      return err({
        code: 'OPERATION_FAILED' as const,
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
        return err({ code: 'AUTH_EXPIRED' as const, message: error.message })
      }
      return err({
        code: 'OPERATION_FAILED' as const,
        message: error instanceof Error ? error.message : 'Failed to fetch usage'
      })
    }
  })

  // Utility
  secureHandle('app:open-external', (_event, ...args: unknown[]) => {
    const url = args[0] as string
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' || !ALLOWED_EXTERNAL_HOSTS.includes(parsed.hostname)) {
        log.warn(`Blocked shell.openExternal for: ${url}`)
        return
      }
      shell.openExternal(url)
    } catch {
      log.warn(`Invalid URL for shell.openExternal: ${url}`)
    }
  })
}

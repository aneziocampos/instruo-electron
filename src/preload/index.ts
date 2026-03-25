import { contextBridge, ipcRenderer } from 'electron'
import type { RecordingState, StepThumbnail, GuideUploadParams, UsageResponse, GuideResponse } from '../shared/types'
import type { AppError, Result } from '../shared/errors'

const api = {
  // --- Auth (invoke) ---
  getToken: (): Promise<Result<string | null>> => ipcRenderer.invoke('auth:get-token'),
  signOut: (): Promise<void> => ipcRenderer.invoke('auth:sign-out'),
  openLogin: (): Promise<void> => ipcRenderer.invoke('auth:open-login'),

  // --- Recording (invoke) ---
  startRecording: (): Promise<void> => ipcRenderer.invoke('recording:start'),
  stopRecording: (): Promise<void> => ipcRenderer.invoke('recording:stop'),
  pauseRecording: (): Promise<void> => ipcRenderer.invoke('recording:pause'),
  cancelRecording: (): Promise<void> => ipcRenderer.invoke('recording:cancel'),
  getRecordingState: (): Promise<RecordingState> => ipcRenderer.invoke('recording:get-state'),
  getRecordingSteps: (): Promise<StepThumbnail[]> => ipcRenderer.invoke('recording:get-steps'),

  // --- Guide (invoke) ---
  uploadGuide: (params: GuideUploadParams): Promise<Result<GuideResponse>> =>
    ipcRenderer.invoke('guide:upload-all', params),

  // --- Usage (invoke) ---
  fetchUsage: (): Promise<Result<UsageResponse>> => ipcRenderer.invoke('usage:fetch'),

  // --- Utility (invoke) ---
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('app:open-external', url),

  // --- Permissions ---
  checkAccessibilityPermission: (): Promise<boolean> =>
    ipcRenderer.invoke('permission:check-accessibility'),
  checkScreenPermission: (): Promise<boolean> =>
    ipcRenderer.invoke('permission:check-screen'),
  requestAccessibilityPermission: (): Promise<void> =>
    ipcRenderer.invoke('permission:request-accessibility'),
  requestScreenPermission: (): Promise<void> =>
    ipcRenderer.invoke('permission:request-screen'),

  // --- Generic invoke (for extensibility) ---
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> =>
    ipcRenderer.invoke(channel, ...args),

  // --- Events (main → renderer subscriptions) ---
  onAuthenticated: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('auth:authenticated', handler)
    return () => ipcRenderer.removeListener('auth:authenticated', handler)
  },

  onRecordingStatusChanged: (callback: (state: RecordingState) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: RecordingState): void => callback(state)
    ipcRenderer.on('recording:status-changed', handler)
    return () => ipcRenderer.removeListener('recording:status-changed', handler)
  },

  onUploadProgress: (callback: (uploaded: number, total: number) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, uploaded: number, total: number): void =>
      callback(uploaded, total)
    ipcRenderer.on('upload:progress', handler)
    return () => ipcRenderer.removeListener('upload:progress', handler)
  },

  onUploadError: (callback: (error: AppError) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: AppError): void => callback(error)
    ipcRenderer.on('upload:error', handler)
    return () => ipcRenderer.removeListener('upload:error', handler)
  },

  onUploadComplete: (callback: (guideUrl: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, guideUrl: string): void => callback(guideUrl)
    ipcRenderer.on('upload:complete', handler)
    return () => ipcRenderer.removeListener('upload:complete', handler)
  }
} as const

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api

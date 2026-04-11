import type { Result } from './errors'
import type {
  RecordingState,
  StepThumbnail,
  GuideUploadParams,
  GuideResponse,
  UsageResponse
} from './types'

// --- Request/response channels (renderer invokes, main handles) ---

export interface IpcInvokeChannels {
  'auth:get-token': { args: []; return: Result<string | null> }
  'auth:sign-out': { args: []; return: void }
  'auth:open-login': { args: []; return: void }
  'recording:start': { args: []; return: void }
  'recording:stop': { args: []; return: void }
  'recording:pause': { args: []; return: void }
  'recording:resume': { args: []; return: void }
  'recording:cancel': { args: []; return: void }
  'recording:get-state': { args: []; return: RecordingState }
  'recording:get-steps': { args: []; return: StepThumbnail[] }
  'guide:upload-all': { args: [params: GuideUploadParams]; return: Result<GuideResponse> }
  'usage:fetch': { args: []; return: Result<UsageResponse> }
  'app:open-external': { args: [url: string]; return: void }
  'permission:check-accessibility': { args: []; return: boolean }
  'permission:check-screen': { args: []; return: boolean }
  'permission:request-accessibility': { args: []; return: void }
  'permission:request-screen': { args: []; return: void }
}

// --- Event channels (main sends, renderer listens) ---

export interface IpcEventChannels {
  'auth:authenticated': { args: [] }
  'recording:status-changed': { args: [state: RecordingState] }
  'upload:progress': { args: [uploaded: number, total: number] }
}

// --- Type helpers for enforcing the contract ---

export type InvokeChannel = keyof IpcInvokeChannels

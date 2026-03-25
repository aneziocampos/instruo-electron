// --- Step Action Types ---

export const STEP_ACTION_TYPES = [
  'click',
  'rightClick',
  'doubleClick',
  'type',
  'check',
  'select',
  'shortcut'
] as const

export type StepActionType = (typeof STEP_ACTION_TYPES)[number]

// --- Element Info (from UIA) ---

export interface ElementInfo {
  readonly controlType: number
  readonly name: string
  readonly automationId: string
  readonly className: string
  readonly isPassword: boolean
  readonly parentNames: readonly string[]
}

// --- Captured Step (main process) ---

export interface CapturedStep {
  id: string
  timestamp: number
  title: string
  description: string
  actionType: StepActionType
  typedValue: string | null
  element: ElementInfo | null
  screenshotPath: string
  click: { x: number; y: number; button: 'left' | 'right' }
  screen: { width: number; height: number; displayId: string }
  app: { name: string; windowTitle: string }
}

// --- Step Thumbnail (renderer receives these, not full screenshots) ---

export interface StepThumbnail {
  id: string
  title: string
  description: string
  actionType: StepActionType
  thumbnailDataUrl: string
  app: { name: string; windowTitle: string }
}

// --- Recording State (discriminated union) ---

export type RecordingState =
  | { status: 'idle' }
  | { status: 'recording'; stepCount: number; startedAt: number }
  | { status: 'paused'; stepCount: number; pausedAt: number }
  | { status: 'review'; steps: StepThumbnail[] }

// --- Guide types ---

export interface GuideUploadParams {
  title: string
  guideType: 'linear' | 'interactive'
  aiWriter: string | null
  customAiWriterId: string | null
  teamId: string | null
}

export interface GuideResponse {
  slug: string
  url: string
}

// --- Usage ---

export interface UsageResponse {
  user: {
    name: string
    email: string
  }
  plan: {
    name: string
    guideLimit: number | null
    guidesUsed: number
  }
  aiWriters: AiWriter[]
  defaultAiWriter: string | null
}

export interface AiWriter {
  id: string
  name: string
  isCustom: boolean
}

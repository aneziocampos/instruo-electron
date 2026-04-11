import log from 'electron-log'
import type { RecordingState, StepThumbnail } from '../shared/types'
import * as stepStore from './step-store'
import * as capturePipeline from './capture-pipeline'
import { getMainWindow } from './index'

let state: RecordingState = { status: 'idle' }
let captureQueue: Promise<void> = Promise.resolve()
let isTransitioning = false

// --- Public API ---

export function getState(): RecordingState {
  return state
}

export function start(): void {
  if (isTransitioning) return
  if (state.status !== 'idle') {
    log.warn(`Cannot start recording from state: ${state.status}`)
    return
  }

  stepStore.clearSteps()
  capturePipeline.resetLastClick()
  state = { status: 'recording', stepCount: 0, startedAt: Date.now() }
  captureQueue = Promise.resolve()
  notifyRenderer()
  log.info('Recording started')
}

export async function stop(): Promise<void> {
  if (isTransitioning) return
  if (state.status !== 'recording' && state.status !== 'paused') {
    log.warn(`Cannot stop recording from state: ${state.status}`)
    return
  }

  isTransitioning = true
  try {
    // Transition to a non-recording state FIRST, then await queue
    state = { status: 'idle' } // Transitional — captures will see this and bail out

    await captureQueue
    await stepStore.flush().catch((e) => log.error('Failed to flush steps on stop:', e))

    const thumbnails = await stepStore.getStepThumbnails()
    state = { status: 'review', steps: thumbnails }
    notifyRenderer()
    log.info(`Recording stopped (${stepStore.getStepCount()} steps)`)
  } finally {
    isTransitioning = false
  }
}

export function pause(): void {
  if (state.status !== 'recording') {
    log.warn(`Cannot pause from state: ${state.status}`)
    return
  }

  state = { status: 'paused', stepCount: stepStore.getStepCount(), pausedAt: Date.now() }
  notifyRenderer()
  log.info('Recording paused')
}

export function resume(): void {
  if (state.status !== 'paused') {
    log.warn(`Cannot resume from state: ${state.status}`)
    return
  }

  state = { status: 'recording', stepCount: stepStore.getStepCount(), startedAt: Date.now() }
  notifyRenderer()
  log.info('Recording resumed')
}

export function cancel(): void {
  if (state.status !== 'recording' && state.status !== 'paused' && state.status !== 'review') {
    log.warn(`Cannot cancel from state: ${state.status}`)
    return
  }

  stepStore.clearSteps()
  state = { status: 'idle' }
  notifyRenderer()
  log.info('Recording cancelled')
}

export function getStepThumbnails(): Promise<StepThumbnail[]> {
  return stepStore.getStepThumbnails()
}

export function isRecording(): boolean {
  return state.status === 'recording'
}

// --- Capture Queue ---

export function enqueueClick(
  x: number,
  y: number,
  button: 'left' | 'right',
  screenshotPath: string | null,
  screenInfo: { width: number; height: number; displayId: string }
): void {
  // State guard
  if (state.status !== 'recording') return

  // P2: Capture startedAt before entering async closure (avoids unsafe cast)
  const startedAt = state.startedAt

  captureQueue = captureQueue
    .then(async () => {
      // Re-check state (could have changed while queued)
      if (state.status !== 'recording') return

      const result = await capturePipeline.processClick(
        { x, y, button, time: Date.now() },
        screenshotPath,
        screenInfo
      )

      // P1-012: Re-check AFTER processClick too (stop() may have been called during)
      if (state.status !== 'recording') return

      if (result.step) {
        state = {
          status: 'recording',
          stepCount: stepStore.getStepCount(),
          startedAt
        }
        notifyRenderer()
      }

      if (result.shouldStop) {
        log.info('40-step limit reached, auto-stopping')
        await stop()
      }
    })
    .catch((error) => {
      log.error('Capture queue error:', error)
    })
}

// --- Renderer Notification ---

function notifyRenderer(): void {
  const mainWindow = getMainWindow()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('recording:status-changed', state)
  }
}

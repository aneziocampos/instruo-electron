import log from 'electron-log'
import type { RecordingState, StepThumbnail } from '../shared/types'
import * as stepStore from './step-store'
import * as capturePipeline from './capture-pipeline'
import { getMainWindow } from './index'

let state: RecordingState = { status: 'idle' }
let captureQueue: Promise<void> = Promise.resolve()

// --- Public API ---

export function getState(): RecordingState {
  return state
}

export function start(): void {
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

export function stop(): void {
  if (state.status !== 'recording' && state.status !== 'paused') {
    log.warn(`Cannot stop recording from state: ${state.status}`)
    return
  }

  state = { status: 'review', steps: stepStore.getStepThumbnails() }
  stepStore.flush().catch((e) => log.error('Failed to flush steps on stop:', e))
  notifyRenderer()
  log.info('Recording stopped')
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
  if (state.status !== 'recording' && state.status !== 'paused') {
    log.warn(`Cannot cancel from state: ${state.status}`)
    return
  }

  stepStore.clearSteps()
  state = { status: 'idle' }
  notifyRenderer()
  log.info('Recording cancelled')
}

export function discard(): void {
  if (state.status !== 'review') {
    log.warn(`Cannot discard from state: ${state.status}`)
    return
  }

  stepStore.clearSteps()
  state = { status: 'idle' }
  notifyRenderer()
  log.info('Recording discarded')
}

export function getStepThumbnails(): StepThumbnail[] {
  return stepStore.getStepThumbnails()
}

export function isRecording(): boolean {
  return state.status === 'recording'
}

// --- Capture Queue ---

/**
 * Enqueue a click capture. Called from global-hooks.ts on mousedown.
 * The screenshotBuffer is captured EAGERLY before queuing.
 */
export function enqueueClick(
  x: number,
  y: number,
  button: 'left' | 'right',
  screenshotBuffer: Buffer | null,
  screenshotPath: string | null,
  screenInfo: { width: number; height: number; displayId: string }
): void {
  // State guard — reject if not recording
  if (state.status !== 'recording') return

  captureQueue = captureQueue
    .then(async () => {
      // Re-check state (could have changed while queued)
      if (state.status !== 'recording') return

      const result = await capturePipeline.processClick(
        { x, y, button, time: Date.now() },
        screenshotBuffer,
        screenshotPath,
        screenInfo
      )

      if (result.step) {
        state = {
          status: 'recording',
          stepCount: stepStore.getStepCount(),
          startedAt: (state as { startedAt: number }).startedAt
        }
        notifyRenderer()
      }

      if (result.shouldStop) {
        log.info('40-step limit reached, auto-stopping')
        stop()
      }
    })
    .catch((error) => {
      log.error('Capture queue error:', error)
      // Queue continues — one failure must not kill subsequent captures
    })
}

// --- Renderer Notification ---

function notifyRenderer(): void {
  const mainWindow = getMainWindow()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('recording:status-changed', state)
  }
}

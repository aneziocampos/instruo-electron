import { randomUUID } from 'crypto'
import log from 'electron-log'
import type { CapturedStep, StepActionType } from '../shared/types'
import { MAX_STEPS, UIA_TIMEOUT_MS, DOUBLE_CLICK_THRESHOLD_MS } from '../shared/constants'
import * as axClient from './ax-client'
import * as stepStore from './step-store'
import { generateStepTitle } from './step-title-generator'

interface ClickEvent {
  x: number
  y: number
  button: 'left' | 'right'
  time: number
}

let lastClick: ClickEvent | null = null

// --- Public API ---

/**
 * Process a mouse click into a captured step.
 * Called from the capture queue — serialized, one at a time.
 * The screenshotPromise is started BEFORE queuing (eager capture).
 */
export async function processClick(
  event: ClickEvent,
  _screenshotBuffer: Buffer | null,
  screenshotPath: string | null,
  screenInfo: { width: number; height: number; displayId: string }
): Promise<{ step: CapturedStep | null; shouldStop: boolean }> {
  // Double-click detection (retroactive)
  if (isDoubleClick(event)) {
    if (stepStore.upgradeLastStepToDoubleClick()) {
      lastClick = null
      return { step: null, shouldStop: false }
    }
  }
  lastClick = event

  // Determine action type
  const actionType: StepActionType = event.button === 'right' ? 'rightClick' : 'click'

  // Query macOS Accessibility API (with timeout)
  const element = await queryElementWithTimeout(event.x, event.y)
  const appInfo = axClient.getAppInfo(event.x, event.y)

  // Generate step title
  const title = generateStepTitle(element, actionType, appInfo)

  // Build step
  const step: CapturedStep = {
    id: randomUUID(),
    timestamp: Date.now(),
    title,
    description: '',
    actionType,
    typedValue: null,
    element,
    screenshotPath: screenshotPath || '',
    click: { x: event.x, y: event.y, button: event.button },
    screen: screenInfo,
    app: appInfo
  }

  stepStore.addStep(step)

  const shouldStop = stepStore.getStepCount() >= MAX_STEPS

  return { step, shouldStop }
}

/**
 * Flush any pending typing session by updating the last step's description.
 */
export function flushTypingSession(typedValue: string, isPassword: boolean): void {
  const masked = isPassword ? '••••' : typedValue
  stepStore.updateLastStepDescription(
    isPassword ? 'Typed password' : `Typed "${masked}"`,
    masked
  )
}

export function resetLastClick(): void {
  lastClick = null
}

// --- Internal ---

function isDoubleClick(event: ClickEvent): boolean {
  if (!lastClick) return false
  const timeDiff = event.time - lastClick.time
  const distX = Math.abs(event.x - lastClick.x)
  const distY = Math.abs(event.y - lastClick.y)
  return timeDiff < DOUBLE_CLICK_THRESHOLD_MS && distX < 5 && distY < 5
}

async function queryElementWithTimeout(
  x: number,
  y: number
): Promise<ReturnType<typeof axClient.getElementAt>> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      log.warn(`AX query timed out at (${x}, ${y})`)
      resolve(null)
    }, UIA_TIMEOUT_MS)

    try {
      // axClient.getElementAt is synchronous (C FFI call)
      // Wrap in a microtask to allow the timeout to work
      const result = axClient.getElementAt(x, y)
      clearTimeout(timeout)
      resolve(result)
    } catch (error) {
      clearTimeout(timeout)
      log.error('AX query failed:', error)
      resolve(null)
    }
  })
}

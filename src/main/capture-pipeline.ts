import { randomUUID } from 'crypto'
import log from 'electron-log'
import type { CapturedStep, StepActionType } from '../shared/types'
import { MAX_STEPS, DOUBLE_CLICK_THRESHOLD_MS } from '../shared/constants'
import { getClickContext } from './ax-client'
import * as stepStore from './step-store'
import { generateStepTitle } from './step-title-generator'

interface ClickEvent {
  x: number
  y: number
  button: 'left' | 'right'
  time: number
}

let lastClick: ClickEvent | null = null

/**
 * Process a mouse click into a captured step.
 * Called from the capture queue — serialized, one at a time.
 */
export async function processClick(
  event: ClickEvent,
  screenshotPath: string | null,
  screenInfo: { width: number; height: number; displayId: string }
): Promise<{ step: CapturedStep | null; shouldStop: boolean }> {
  // Retroactive double-click detection
  if (isDoubleClick(event)) {
    if (stepStore.upgradeLastStepToDoubleClick()) {
      lastClick = null
      return { step: null, shouldStop: false }
    }
  }
  lastClick = event

  const actionType: StepActionType = event.button === 'right' ? 'rightClick' : 'click'

  // P1-010: Single unified AX query (3 FFI calls instead of 5)
  // P2: Direct call — no fake timeout wrapper (sync FFI can't be interrupted by setTimeout)
  let clickContext = { element: null as ReturnType<typeof getClickContext>['element'], app: { name: '', windowTitle: '' } }
  try {
    clickContext = getClickContext(event.x, event.y)
  } catch (error) {
    log.error('AX query failed:', error)
  }

  const title = generateStepTitle(clickContext.element, actionType, clickContext.app)

  const step: CapturedStep = {
    id: randomUUID(),
    timestamp: Date.now(),
    title,
    description: '',
    actionType,
    typedValue: null,
    element: clickContext.element,
    screenshotPath: screenshotPath || '',
    click: { x: event.x, y: event.y, button: event.button },
    screen: screenInfo,
    app: clickContext.app
  }

  stepStore.addStep(step)

  return { step, shouldStop: stepStore.getStepCount() >= MAX_STEPS }
}

export function resetLastClick(): void {
  lastClick = null
}

// --- Internal ---

const DOUBLE_CLICK_DISTANCE_PX = 5

function isDoubleClick(event: ClickEvent): boolean {
  if (!lastClick) return false
  const timeDiff = event.time - lastClick.time
  const distX = Math.abs(event.x - lastClick.x)
  const distY = Math.abs(event.y - lastClick.y)
  return timeDiff < DOUBLE_CLICK_THRESHOLD_MS && distX < DOUBLE_CLICK_DISTANCE_PX && distY < DOUBLE_CLICK_DISTANCE_PX
}

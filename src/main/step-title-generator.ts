import type { ElementInfo, StepActionType } from '../shared/types'

/**
 * Generate a human-readable step title from element metadata.
 * 4-layer priority system adapted for macOS AX attributes.
 * Pure function — no side effects, trivially testable.
 */
export function generateStepTitle(
  element: ElementInfo | null,
  actionType: StepActionType,
  appContext: { name: string; windowTitle: string }
): string {
  const prefix = getActionPrefix(actionType)

  if (element?.isPassword) {
    return `${prefix} [password field]`
  }

  if (!element) {
    // Layer 4 fallback: no element info
    if (appContext.windowTitle) {
      return `${prefix} ${appContext.windowTitle}`
    }
    if (appContext.name) {
      return `${prefix} ${appContext.name}`
    }
    return prefix
  }

  // Layer 1: Element name (AXTitle, AXDescription)
  const label = element.name
  if (label) {
    return `${prefix} ${label}`
  }

  // Layer 2: Walk parent names for context
  if (element.parentNames.length > 0) {
    const meaningfulParent = element.parentNames.find((n) => n.length > 0)
    if (meaningfulParent) {
      return `${prefix} ${meaningfulParent}`
    }
  }

  // Layer 3: Window title as fallback
  if (appContext.windowTitle) {
    return `${prefix} ${appContext.windowTitle}`
  }

  // Layer 4: App name as last resort
  if (appContext.name) {
    return `${prefix} ${appContext.name}`
  }

  return prefix
}

function getActionPrefix(actionType: StepActionType): string {
  switch (actionType) {
    case 'click':
      return 'Click on'
    case 'rightClick':
      return 'Right-click on'
    case 'doubleClick':
      return 'Double-click on'
    case 'type':
      return 'Type in'
    case 'check':
      return 'Check'
    case 'select':
      return 'Select in'
    case 'shortcut':
      return 'Press'
  }
}

import log from 'electron-log'
import type { ElementInfo as SharedElementInfo } from '../shared/types'

// Lazy-load native addon to avoid startup cost
let native: typeof import('instruo-native') | null = null

function getNative(): typeof import('instruo-native') {
  if (!native) {
    native = require('instruo-native')
  }
  return native!
}

// --- Permission ---

export function checkAccessibilityPermission(prompt: boolean): boolean {
  try {
    return getNative().checkAccessibility(prompt)
  } catch (error) {
    log.error('Failed to check accessibility permission:', error)
    return false
  }
}

// --- Element Detection ---

export function getElementAt(x: number, y: number): SharedElementInfo | null {
  try {
    const el = getNative().getElementAtPosition(x, y)
    if (!el) return null

    const parents = getNative().getParentChain(x, y, 5)
    const parentNames = parents
      .map((p) => p.title || p.role || '')
      .filter(Boolean)

    return {
      controlType: roleToControlType(el.role),
      name: el.title || el.description || '',
      automationId: '',
      className: el.role || '',
      isPassword: el.subrole === 'AXSecureTextField',
      parentNames
    }
  } catch (error) {
    log.error('AX element query failed:', error)
    return null
  }
}

export function getAppInfo(
  x: number,
  y: number
): { name: string; windowTitle: string } {
  try {
    const el = getNative().getElementAtPosition(x, y)
    if (!el) return { name: '', windowTitle: '' }

    const processName = el.pid ? (getNative().getProcessName(el.pid) ?? '') : ''
    const parents = getNative().getParentChain(x, y, 10)

    // Find the window title from the parent chain
    const windowParent = parents.find((p) => p.role === 'AXWindow')
    const windowTitle = windowParent?.title || ''

    return { name: processName, windowTitle }
  } catch (error) {
    log.error('AX app info query failed:', error)
    return { name: '', windowTitle: '' }
  }
}

// --- Helpers ---

function roleToControlType(role: string | null): number {
  // Map AX roles to numeric control types for consistency with the shared type
  const roleMap: Record<string, number> = {
    AXButton: 50000,
    AXCheckBox: 50002,
    AXComboBox: 50003,
    AXTextField: 50004,
    AXTextArea: 50004,
    AXList: 50008,
    AXMenu: 50009,
    AXMenuItem: 50011,
    AXRadioButton: 50012,
    AXSlider: 50015,
    AXStaticText: 50020,
    AXTabGroup: 50023,
    AXTable: 50024,
    AXToolbar: 50027,
    AXWindow: 50032,
    AXLink: 50005,
    AXPopUpButton: 50003,
    AXScrollBar: 50014,
    AXImage: 50006,
    AXGroup: 50026
  }
  return roleMap[role || ''] ?? 0
}

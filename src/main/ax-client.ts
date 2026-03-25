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

// --- Unified Element + App Info Query (single set of FFI calls) ---

export interface ClickContext {
  element: SharedElementInfo | null
  app: { name: string; windowTitle: string }
}

/**
 * Query element info AND app context in a single call.
 * Makes exactly 3 FFI calls: getElementAtPosition + getParentChain + getProcessName.
 * Previously this was split across getElementAt + getAppInfo = 5 FFI calls.
 */
export function getClickContext(x: number, y: number): ClickContext {
  try {
    const el = getNative().getElementAtPosition(x, y)
    if (!el) {
      return { element: null, app: { name: '', windowTitle: '' } }
    }

    // Single parent chain query (max depth covers both element context and window title)
    const parents = getNative().getParentChain(x, y, 10)
    const parentNames = parents
      .map((p) => p.title || p.role || '')
      .filter(Boolean)

    const processName = el.pid ? (getNative().getProcessName(el.pid) ?? '') : ''
    const windowParent = parents.find((p) => p.role === 'AXWindow')

    return {
      element: {
        controlType: roleToControlType(el.role),
        name: el.title || el.description || '',
        automationId: '',
        className: el.role || '',
        isPassword: el.subrole === 'AXSecureTextField',
        parentNames
      },
      app: {
        name: processName,
        windowTitle: windowParent?.title || ''
      }
    }
  } catch (error) {
    log.error('AX click context query failed:', error)
    return { element: null, app: { name: '', windowTitle: '' } }
  }
}

// --- Helpers ---

function roleToControlType(role: string | null): number {
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

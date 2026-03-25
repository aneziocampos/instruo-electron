declare module 'uiohook-napi' {
  interface UiohookMouseEvent {
    type: number
    time: number
    altKey: boolean
    ctrlKey: boolean
    metaKey: boolean
    shiftKey: boolean
    x: number
    y: number
    button: number
    clicks: number
  }

  interface UiohookKeyboardEvent {
    type: number
    time: number
    altKey: boolean
    ctrlKey: boolean
    metaKey: boolean
    shiftKey: boolean
    keycode: number
  }

  interface UiohookWheelEvent {
    type: number
    time: number
    x: number
    y: number
    amount: number
    direction: number
    rotation: number
  }

  type UiohookEvent = UiohookMouseEvent | UiohookKeyboardEvent | UiohookWheelEvent

  interface UIOhook {
    start(): void
    stop(): void
    on(event: 'mousedown', callback: (e: UiohookMouseEvent) => void): void
    on(event: 'mouseup', callback: (e: UiohookMouseEvent) => void): void
    on(event: 'mousemove', callback: (e: UiohookMouseEvent) => void): void
    on(event: 'click', callback: (e: UiohookMouseEvent) => void): void
    on(event: 'keydown', callback: (e: UiohookKeyboardEvent) => void): void
    on(event: 'keyup', callback: (e: UiohookKeyboardEvent) => void): void
    on(event: 'wheel', callback: (e: UiohookWheelEvent) => void): void
    on(event: 'input', callback: (e: UiohookEvent) => void): void
    removeAllListeners(): void
  }

  export const uIOhook: UIOhook
}

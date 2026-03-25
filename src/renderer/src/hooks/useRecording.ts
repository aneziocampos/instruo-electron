import { useState, useEffect } from 'react'
import type { RecordingState } from '../../../shared/types'

export function useRecording() {
  const [state, setState] = useState<RecordingState>({ status: 'idle' })

  useEffect(() => {
    // Pull current state on mount
    window.electronAPI.getRecordingState().then(setState)

    // Subscribe to state changes
    const unsubscribe = window.electronAPI.onRecordingStatusChanged(setState)
    return unsubscribe
  }, [])

  return {
    state,
    start: () => window.electronAPI.startRecording(),
    stop: () => window.electronAPI.stopRecording(),
    pause: () => window.electronAPI.pauseRecording(),
    cancel: () => window.electronAPI.cancelRecording(),
    getSteps: () => window.electronAPI.getRecordingSteps()
  } as const
}

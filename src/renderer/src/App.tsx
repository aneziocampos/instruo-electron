import { useState, useEffect, useCallback } from 'react'
import { AuthPage } from './pages/AuthPage'
import { IdlePage } from './pages/IdlePage'
import { PermissionPage } from './pages/PermissionPage'
import type { RecordingState } from '../../shared/types'

type AppView = 'loading' | 'auth' | 'permissions' | 'idle' | 'countdown' | 'recording' | 'review'

export function App() {
  const [view, setView] = useState<AppView>('loading')
  const [countdownNumber, setCountdownNumber] = useState(3)
  const [recordingState, setRecordingState] = useState<RecordingState>({ status: 'idle' })

  // Check auth on mount
  useEffect(() => {
    window.electronAPI
      .getToken()
      .then((result) => {
        setView(result.ok && result.value ? 'idle' : 'auth')
      })
      .catch(() => setView('auth'))
  }, [])

  // Listen for recording state changes from main process
  useEffect(() => {
    const unsubscribe = window.electronAPI.onRecordingStatusChanged((state) => {
      setRecordingState(state)
      if (state.status === 'review') {
        setView('review')
      } else if (state.status === 'idle') {
        setView('idle')
      }
    })
    return unsubscribe
  }, [])

  const handleStartRecording = useCallback(async () => {
    // Check permissions first
    const [acc, scr] = await Promise.all([
      window.electronAPI.checkAccessibilityPermission(),
      window.electronAPI.checkScreenPermission()
    ]).catch(() => [false, false])

    if (!acc || !scr) {
      setView('permissions')
      return
    }

    // Start countdown
    setView('countdown')
    setCountdownNumber(3)

    const countdown = (n: number) => {
      if (n <= 0) {
        window.electronAPI.startRecording()
        setView('recording')
        return
      }
      setCountdownNumber(n)
      setTimeout(() => countdown(n - 1), 1000)
    }
    countdown(3)
  }, [])

  const handleEscDuringCountdown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && view === 'countdown') {
      setView('idle')
    }
  }, [view])

  useEffect(() => {
    window.addEventListener('keydown', handleEscDuringCountdown)
    return () => window.removeEventListener('keydown', handleEscDuringCountdown)
  }, [handleEscDuringCountdown])

  if (view === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (view === 'auth') {
    return <AuthPage onAuthenticated={() => setView('idle')} />
  }

  if (view === 'permissions') {
    return <PermissionPage onAllGranted={() => setView('idle')} />
  }

  if (view === 'countdown') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-text-secondary text-sm mb-4">Recording starts in...</p>
        <span className="text-8xl font-display font-bold text-accent animate-pulse">
          {countdownNumber}
        </span>
        <p className="text-text-tertiary text-xs mt-8">Press Esc to cancel</p>
      </div>
    )
  }

  if (view === 'recording') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-4 h-4 bg-accent rounded-full animate-pulse mb-4" />
        <p className="text-text-primary text-lg font-display">
          Recording...
        </p>
        {recordingState.status === 'recording' && (
          <p className="text-text-secondary text-sm mt-2">
            {recordingState.stepCount} steps captured
          </p>
        )}
        <p className="text-text-tertiary text-xs mt-6">
          App will minimize to tray. Use Cmd+Shift+R to stop.
        </p>
      </div>
    )
  }

  if (view === 'review') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <h1 className="text-2xl font-display font-bold text-text-primary mb-4">
          Review your guide
        </h1>
        {recordingState.status === 'review' && (
          <p className="text-text-secondary text-sm mb-6">
            {recordingState.steps.length} steps captured
          </p>
        )}
        <p className="text-text-tertiary text-sm mb-8">
          Full review page coming in Phase 2C
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => window.electronAPI.cancelRecording()}
            className="text-text-secondary text-sm hover:text-text-primary transition-colors"
          >
            Discard
          </button>
          <button
            className="bg-accent hover:bg-accent-hover text-ink font-semibold py-2 px-6 rounded-lg transition-colors"
            onClick={() => {
              // TODO: Phase 2C — open upload flow
            }}
          >
            Save guide
          </button>
        </div>
      </div>
    )
  }

  // Default: idle
  return (
    <IdlePage
      onStartRecording={handleStartRecording}
      onSignOut={() => setView('auth')}
    />
  )
}

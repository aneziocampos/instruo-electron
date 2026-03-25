import { useState, useEffect, useCallback } from 'react'
import { AuthPage } from './pages/AuthPage'
import { IdlePage } from './pages/IdlePage'
import { PermissionPage } from './pages/PermissionPage'
import { ReviewPage } from './pages/ReviewPage'
import { UploadPage } from './pages/UploadPage'
import { SuccessPage } from './pages/SuccessPage'
import type { RecordingState, StepThumbnail, GuideUploadParams } from '../../shared/types'

type AppView = 'loading' | 'auth' | 'permissions' | 'idle' | 'countdown' | 'recording' | 'review' | 'uploading' | 'success'

export function App() {
  const [view, setView] = useState<AppView>('loading')
  const [countdownNumber, setCountdownNumber] = useState(3)
  const [recordingState, setRecordingState] = useState<RecordingState>({ status: 'idle' })
  const [reviewSteps, setReviewSteps] = useState<StepThumbnail[]>([])
  const [guideUrl, setGuideUrl] = useState('')

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
        setReviewSteps(state.steps)
        setView('review')
      } else if (state.status === 'idle' && view === 'recording') {
        setView('idle')
      }
    })
    return unsubscribe
  }, [view])

  const handleStartRecording = useCallback(async () => {
    const [acc, scr] = await Promise.all([
      window.electronAPI.checkAccessibilityPermission(),
      window.electronAPI.checkScreenPermission()
    ]).catch(() => [false, false])

    if (!acc || !scr) {
      setView('permissions')
      return
    }

    // Countdown
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

  // Esc cancels countdown
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && view === 'countdown') setView('idle')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [view])

  const handleUpload = useCallback(async (params: GuideUploadParams) => {
    setView('uploading')
    const result = await window.electronAPI.uploadGuide(params)
    if (result.ok) {
      setGuideUrl(result.value.url)
      setView('success')
    }
    // Errors handled by upload:error event → UploadPage
  }, [])

  const handleDiscard = useCallback(() => {
    window.electronAPI.cancelRecording()
    setView('idle')
  }, [])

  const handleRecordAnother = useCallback(() => {
    setReviewSteps([])
    setGuideUrl('')
    setView('idle')
  }, [])

  // --- Render ---

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
        <p className="text-text-primary text-lg font-display">Recording...</p>
        {recordingState.status === 'recording' && (
          <p className="text-text-secondary text-sm mt-2">
            {recordingState.stepCount} steps captured
          </p>
        )}
        <p className="text-text-tertiary text-xs mt-6">
          {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Shift+R to stop
        </p>
      </div>
    )
  }

  if (view === 'review') {
    return (
      <ReviewPage
        steps={reviewSteps}
        onUpload={handleUpload}
        onDiscard={handleDiscard}
      />
    )
  }

  if (view === 'uploading') {
    return (
      <UploadPage
        totalSteps={reviewSteps.length}
        onComplete={(url) => {
          setGuideUrl(url)
          setView('success')
        }}
        onError={() => setView('review')}
      />
    )
  }

  if (view === 'success') {
    return (
      <SuccessPage
        guideUrl={guideUrl}
        stepCount={reviewSteps.length}
        onRecordAnother={handleRecordAnother}
      />
    )
  }

  return (
    <IdlePage
      onStartRecording={handleStartRecording}
      onSignOut={() => setView('auth')}
    />
  )
}

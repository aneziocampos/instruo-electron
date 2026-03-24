import { useState, useEffect } from 'react'
import { AuthPage } from './pages/AuthPage'
import { IdlePage } from './pages/IdlePage'

type AppView = 'loading' | 'auth' | 'idle'

export function App(): JSX.Element {
  const [view, setView] = useState<AppView>('loading')

  useEffect(() => {
    // Check for existing token on mount
    window.electronAPI.getToken().then((result) => {
      if (result.ok && result.value) {
        setView('idle')
      } else {
        setView('auth')
      }
    })
  }, [])

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

  return (
    <IdlePage
      onStartRecording={() => {
        // TODO: Phase 2 — start recording, show countdown, minimize to tray
      }}
      onSignOut={() => setView('auth')}
    />
  )
}

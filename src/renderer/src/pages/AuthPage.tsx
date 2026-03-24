import { useState, useEffect, useCallback } from 'react'
import { t } from '../i18n'
import { AUTH_UI_TIMEOUT_MS } from '../../../shared/constants'

export function AuthPage({ onAuthenticated }: { onAuthenticated: () => void }): JSX.Element {
  const [loading, setLoading] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  const handleSignIn = useCallback(() => {
    setLoading(true)
    setTimedOut(false)
    window.electronAPI.openLogin()

    // Timeout after 60 seconds
    const timeout = setTimeout(() => {
      setLoading(false)
      setTimedOut(true)
    }, AUTH_UI_TIMEOUT_MS)

    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    const unsubscribe = window.electronAPI.onTokenReceived(() => {
      setLoading(false)
      onAuthenticated()
    })
    return unsubscribe
  }, [onAuthenticated])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8">
      <h1 className="text-4xl font-display font-bold text-accent mb-2">Instruo</h1>
      <p className="text-text-secondary text-sm mb-10">{t('auth.tagline')}</p>

      {!loading && !timedOut && (
        <button
          onClick={handleSignIn}
          className="w-full max-w-xs bg-accent hover:bg-accent-hover text-ink font-semibold py-3 px-6 rounded-lg transition-colors text-base"
        >
          {t('auth.signIn')}
        </button>
      )}

      {loading && (
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary text-sm">{t('auth.signingIn')}</p>
          <button
            onClick={() => setLoading(false)}
            className="text-text-tertiary text-xs mt-3 hover:text-text-secondary transition-colors"
          >
            {t('auth.cancel')}
          </button>
        </div>
      )}

      {timedOut && (
        <div className="text-center">
          <p className="text-danger text-sm mb-4">{t('auth.timeout')}</p>
          <button
            onClick={handleSignIn}
            className="text-accent text-sm hover:underline"
          >
            {t('auth.tryAgain')}
          </button>
        </div>
      )}

      <a
        href="#"
        onClick={(e) => {
          e.preventDefault()
          window.electronAPI.openExternal('https://instruo.ai/privacy')
        }}
        className="text-text-tertiary text-xs mt-12 hover:text-text-secondary transition-colors"
      >
        Privacy Policy
      </a>
    </div>
  )
}

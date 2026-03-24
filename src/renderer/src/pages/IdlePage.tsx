import { useState, useEffect } from 'react'
import { t } from '../i18n'
import type { UsageResponse } from '../../../shared/types'

interface Props {
  onStartRecording: () => void
  onSignOut: () => void
}

export function IdlePage({ onStartRecording, onSignOut }: Props) {
  const [usage, setUsage] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.electronAPI
      .fetchUsage()
      .then((result) => {
        if (result.ok) {
          setUsage(result.value)
        } else if (result.error.code === 'AUTH_EXPIRED') {
          onSignOut()
          return
        } else {
          setError(result.error.message)
        }
        setLoading(false)
      })
      .catch(() => {
        setError(t('error.network'))
        setLoading(false)
      })
  }, [onSignOut])

  const handleSignOut = async () => {
    await window.electronAPI.signOut()
    onSignOut()
  }

  const isAtLimit =
    usage?.plan.guideLimit != null && usage.plan.guidesUsed >= usage.plan.guideLimit

  const hotkeyDisplay =
    navigator.platform.includes('Mac') ? 'Cmd+Shift+R' : 'Ctrl+Shift+R'

  return (
    <div className="flex flex-col min-h-screen px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          {usage && (
            <>
              <p className="text-text-primary text-sm font-medium">
                {t('idle.welcome', { name: usage.user.name || usage.user.email })}
              </p>
              <p className="text-text-tertiary text-xs">
                {t('idle.plan', { plan: usage.plan.name })}
              </p>
            </>
          )}
          {loading && <div className="h-8 w-32 bg-ink-soft rounded animate-pulse" />}
          {error && <p className="text-danger text-xs">{error}</p>}
        </div>
        <button
          onClick={handleSignOut}
          className="text-text-tertiary text-xs hover:text-text-secondary transition-colors"
        >
          {t('idle.signOut')}
        </button>
      </div>

      {/* Main action */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <button
          onClick={onStartRecording}
          disabled={isAtLimit}
          className="w-full max-w-xs bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-ink font-display font-bold py-4 px-8 rounded-lg transition-all text-lg shadow-[0_0_20px_rgba(34,197,94,0.15)] hover:shadow-[0_0_30px_rgba(34,197,94,0.25)]"
        >
          {t('idle.startRecording')}
        </button>
        <p className="text-text-tertiary text-xs mt-3">
          <kbd className="bg-ink-soft px-1.5 py-0.5 rounded text-text-secondary font-mono text-[10px]">
            {hotkeyDisplay}
          </kbd>
        </p>

        {isAtLimit && (
          <div className="mt-4 text-center">
            <p className="text-danger text-sm">{t('error.planLimit')}</p>
            <button
              onClick={() =>
                window.electronAPI.openExternal('https://app.instruo.ai/settings/billing')
              }
              className="text-accent text-sm mt-1 hover:underline"
            >
              {t('error.upgrade')}
            </button>
          </div>
        )}
      </div>

      {/* Usage footer */}
      {usage && (
        <div className="text-center">
          <p className="text-text-tertiary text-xs">
            {usage.plan.guideLimit
              ? t('idle.usage', {
                  used: usage.plan.guidesUsed,
                  limit: usage.plan.guideLimit
                })
              : t('idle.usageUnlimited', { used: usage.plan.guidesUsed })}
          </p>
        </div>
      )}
    </div>
  )
}

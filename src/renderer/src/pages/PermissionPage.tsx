import { useState, useEffect, useRef } from 'react'
import { t } from '../i18n'

interface Props {
  onAllGranted: () => void
}

export function PermissionPage({ onAllGranted }: Props) {
  const [accessibilityGranted, setAccessibilityGranted] = useState(false)
  const [screenGranted, setScreenGranted] = useState(false)
  const [checking, setChecking] = useState(true)
  const onAllGrantedRef = useRef(onAllGranted)
  onAllGrantedRef.current = onAllGranted

  useEffect(() => {
    let active = true
    const check = async () => {
      const [acc, scr] = await Promise.all([
        window.electronAPI.checkAccessibilityPermission(),
        window.electronAPI.checkScreenPermission()
      ]).catch(() => [false, false])
      if (!active) return
      setAccessibilityGranted(acc)
      setScreenGranted(scr)
      setChecking(false)
      if (acc && scr) onAllGrantedRef.current()
    }
    check()
    const interval = setInterval(check, 2000)
    return () => { active = false; clearInterval(interval) }
  }, [])

  const allGranted = accessibilityGranted && screenGranted

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8">
      <h1 className="text-2xl font-display font-bold text-text-primary mb-2">
        {t('permission.title')}
      </h1>
      <p className="text-text-secondary text-sm mb-8 text-center max-w-xs">
        {t('permission.description')}
      </p>

      <div className="w-full max-w-xs space-y-4">
        <PermissionRow
          label={t('permission.accessibility')}
          description={t('permission.accessibilityDesc')}
          granted={accessibilityGranted}
          onGrant={() => window.electronAPI.requestAccessibilityPermission()}
        />

        <PermissionRow
          label={t('permission.screen')}
          description={t('permission.screenDesc')}
          granted={screenGranted}
          onGrant={() => window.electronAPI.requestScreenPermission()}
        />
      </div>

      {allGranted && (
        <button
          onClick={() => onAllGrantedRef.current()}
          className="mt-8 bg-accent hover:bg-accent-hover text-ink font-semibold py-3 px-8 rounded-lg transition-colors"
        >
          {t('permission.continue')}
        </button>
      )}

      {!allGranted && !checking && (
        <p className="text-text-tertiary text-xs mt-6 text-center max-w-xs">
          {t('permission.hint')}
        </p>
      )}
    </div>
  )
}

function PermissionRow({
  label,
  description,
  granted,
  onGrant
}: {
  label: string
  description: string
  granted: boolean
  onGrant: () => void
}) {
  return (
    <div className="flex items-center justify-between bg-ink-soft rounded-lg p-4">
      <div>
        <p className="text-text-primary text-sm font-medium">{label}</p>
        <p className="text-text-tertiary text-xs">{description}</p>
      </div>
      {granted ? (
        <span className="text-accent text-lg font-bold">✓</span>
      ) : (
        <button
          onClick={onGrant}
          className="text-accent text-xs font-medium hover:underline"
        >
          {t('permission.grant')}
        </button>
      )}
    </div>
  )
}

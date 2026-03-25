import { useState, useEffect, useCallback } from 'react'

interface Props {
  onAllGranted: () => void
}

export function PermissionPage({ onAllGranted }: Props) {
  const [accessibilityGranted, setAccessibilityGranted] = useState(false)
  const [screenGranted, setScreenGranted] = useState(false)
  const [checking, setChecking] = useState(true)

  const checkPermissions = useCallback(async () => {
    try {
      const [acc, scr] = await Promise.all([
        window.electronAPI.checkAccessibilityPermission(),
        window.electronAPI.checkScreenPermission()
      ])
      setAccessibilityGranted(acc)
      setScreenGranted(scr)
      setChecking(false)

      if (acc && scr) {
        onAllGranted()
      }
    } catch {
      setChecking(false)
    }
  }, [onAllGranted])

  useEffect(() => {
    checkPermissions()
    const interval = setInterval(checkPermissions, 2000)
    return () => clearInterval(interval)
  }, [checkPermissions])

  const allGranted = accessibilityGranted && screenGranted

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8">
      <h1 className="text-2xl font-display font-bold text-text-primary mb-2">
        Permissions Required
      </h1>
      <p className="text-text-secondary text-sm mb-8 text-center max-w-xs">
        Instruo needs these permissions to record your screen and detect what you click on.
      </p>

      <div className="w-full max-w-xs space-y-4">
        <PermissionRow
          label="Accessibility"
          description="Detect UI elements and capture keyboard input"
          granted={accessibilityGranted}
          onGrant={() => window.electronAPI.requestAccessibilityPermission()}
        />

        <PermissionRow
          label="Screen Recording"
          description="Capture screenshots during recording"
          granted={screenGranted}
          onGrant={() => window.electronAPI.requestScreenPermission()}
        />
      </div>

      {allGranted && (
        <button
          onClick={onAllGranted}
          className="mt-8 bg-accent hover:bg-accent-hover text-ink font-semibold py-3 px-8 rounded-lg transition-colors"
        >
          Continue
        </button>
      )}

      {!allGranted && !checking && (
        <p className="text-text-tertiary text-xs mt-6 text-center max-w-xs">
          Grant permissions in System Settings, then return here. This page updates automatically.
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
          Grant
        </button>
      )}
    </div>
  )
}

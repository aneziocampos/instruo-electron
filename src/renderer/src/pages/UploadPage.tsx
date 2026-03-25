import { useState, useEffect } from 'react'
import { t } from '../i18n'
import type { AppError } from '../../../shared/errors'

interface Props {
  totalSteps: number
  onComplete: (guideUrl: string) => void
  onError: () => void
}

export function UploadPage({ totalSteps, onComplete, onError }: Props) {
  const [uploaded, setUploaded] = useState(0)
  const [error, setError] = useState<AppError | null>(null)

  useEffect(() => {
    const unsubProgress = window.electronAPI.onUploadProgress((up, _total) => {
      setUploaded(up)
    })

    const unsubError = window.electronAPI.onUploadError((err) => {
      setError(err)
    })

    const unsubComplete = window.electronAPI.onUploadComplete((guideUrl) => {
      onComplete(guideUrl)
    })

    return () => {
      unsubProgress()
      unsubError()
      unsubComplete()
    }
  }, [onComplete])

  const progress = totalSteps > 0 ? (uploaded / totalSteps) * 100 : 0

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8">
        <p className="text-danger text-sm mb-4">{t('upload.failed')}</p>
        <p className="text-text-tertiary text-xs mb-6">{error.message}</p>
        <div className="flex gap-4">
          <button
            onClick={onError}
            className="text-text-secondary text-sm hover:text-text-primary transition-colors"
          >
            Back to review
          </button>
          <button
            onClick={() => {
              setError(null)
              setUploaded(0)
              // Retry will be triggered from parent re-rendering this component
            }}
            className="bg-accent hover:bg-accent-hover text-ink font-semibold py-2 px-6 rounded-lg transition-colors text-sm"
          >
            {t('upload.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8">
      <div className="w-full max-w-xs">
        {/* Progress bar */}
        <div className="h-2 bg-ink-soft rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-text-primary text-sm text-center">
          {t('upload.uploading', { current: uploaded, total: totalSteps })}
        </p>

        {/* Step indicators */}
        <div className="flex flex-wrap gap-1.5 justify-center mt-4">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < uploaded
                  ? 'bg-accent'
                  : i === uploaded
                    ? 'bg-accent animate-pulse'
                    : 'bg-ink-elevated'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

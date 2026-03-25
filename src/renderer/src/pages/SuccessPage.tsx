import { t } from '../i18n'

interface Props {
  guideUrl: string
  stepCount: number
  onRecordAnother: () => void
}

export function SuccessPage({ guideUrl, stepCount, onRecordAnother }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8">
      {/* Checkmark animation */}
      <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-6 animate-bounce">
        <span className="text-ink text-3xl font-bold">✓</span>
      </div>

      <h1 className="text-2xl font-display font-bold text-text-primary mb-2">
        {t('success.title')}
      </h1>
      <p className="text-text-secondary text-sm mb-8">
        {t('success.description', { count: stepCount })}
      </p>

      <button
        onClick={() => window.electronAPI.openExternal(guideUrl)}
        className="w-full max-w-xs bg-accent hover:bg-accent-hover text-ink font-semibold py-3 px-6 rounded-lg transition-colors mb-3"
      >
        {t('success.viewOnline')}
      </button>

      <button
        onClick={onRecordAnother}
        className="w-full max-w-xs border border-border text-text-secondary hover:text-text-primary font-medium py-3 px-6 rounded-lg transition-colors text-sm"
      >
        {t('success.recordAnother')}
      </button>

      <p className="text-text-tertiary text-xs mt-6 text-center max-w-xs">
        {t('success.aiPolishing')}
      </p>
    </div>
  )
}

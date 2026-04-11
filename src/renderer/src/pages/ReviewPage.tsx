import { useState, useEffect, useCallback } from 'react'
import { t } from '../i18n'
import type { StepThumbnail, GuideUploadParams, UsageResponse } from '../../../shared/types'

interface Props {
  steps: StepThumbnail[]
  onUpload: (params: GuideUploadParams) => void
  onDiscard: () => void
}

export function ReviewPage({ steps: initialSteps, onUpload, onDiscard }: Props) {
  const [steps, setSteps] = useState(initialSteps)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [guideTitle, setGuideTitle] = useState('')
  const [guideType, setGuideType] = useState<'linear' | 'interactive'>('linear')
  const [aiWriter, setAiWriter] = useState<string | null>(null)
  const [usage, setUsage] = useState<UsageResponse | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  useEffect(() => {
    let active = true
    window.electronAPI.fetchUsage().then((result) => {
      if (!active) return
      if (result.ok) {
        setUsage(result.value)
        if (result.value.defaultAiWriter) {
          setAiWriter(result.value.defaultAiWriter)
        }
      }
    })
    return () => { active = false }
  }, [])

  // Auto-generate guide title from first step
  useEffect(() => {
    if (steps.length > 0 && !guideTitle) {
      const firstApp = steps[0].app.name || steps[0].app.windowTitle
      setGuideTitle(firstApp ? `Guide: ${firstApp}` : 'New Guide')
    }
  }, [steps, guideTitle])

  const handleEditTitle = useCallback((index: number, newTitle: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, title: newTitle } : s)))
  }, [])

  const handleDeleteStep = useCallback((index: number) => {
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== index)
      setSelectedIndex((prevIdx) => Math.min(prevIdx, Math.max(0, next.length - 1)))
      return next
    })
  }, [])

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return
    setSteps((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
    setSelectedIndex(index - 1)
  }, [])

  const handleMoveDown = useCallback((index: number) => {
    setSteps((prev) => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
    setSelectedIndex(index + 1)
  }, [])

  const handleSave = () => {
    onUpload({
      title: guideTitle || 'Untitled Guide',
      guideType,
      aiWriter,
      customAiWriterId: null,
      teamId: null,
      editedSteps: steps.map((s) => ({ id: s.id, title: s.title, description: s.description }))
    })
  }

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8">
        <p className="text-text-secondary text-lg mb-4">{t('review.noSteps')}</p>
        <button
          onClick={onDiscard}
          className="text-accent text-sm hover:underline"
        >
          {t('review.recordAgain')}
        </button>
      </div>
    )
  }

  const selectedStep = steps[selectedIndex]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header — guide metadata */}
      <div className="px-6 py-4 border-b border-border">
        <input
          type="text"
          value={guideTitle}
          onChange={(e) => setGuideTitle(e.target.value)}
          placeholder={t('review.guideTitle')}
          className="w-full bg-transparent text-text-primary text-lg font-display font-bold outline-none placeholder:text-text-tertiary"
        />
        <div className="flex gap-4 mt-3">
          {/* Guide type toggle */}
          <div className="flex bg-ink-soft rounded-lg overflow-hidden text-xs">
            <button
              onClick={() => setGuideType('linear')}
              className={`px-3 py-1.5 transition-colors ${guideType === 'linear' ? 'bg-accent text-ink' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {t('review.linear')}
            </button>
            <button
              onClick={() => setGuideType('interactive')}
              className={`px-3 py-1.5 transition-colors ${guideType === 'interactive' ? 'bg-accent text-ink' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {t('review.interactive')}
            </button>
          </div>

          {/* AI Writer selector */}
          {usage && usage.aiWriters.length > 0 && (
            <select
              value={aiWriter || ''}
              onChange={(e) => setAiWriter(e.target.value || null)}
              className="bg-ink-soft text-text-secondary text-xs rounded-lg px-3 py-1.5 outline-none border-none"
            >
              <option value="">{t('review.aiWriter')}</option>
              {usage.aiWriters.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — step list (60%) */}
        <div className="w-3/5 border-r border-border overflow-y-auto">
          {steps.map((step, index) => (
            <div
              key={step.id}
              onClick={() => setSelectedIndex(index)}
              className={`group flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-border transition-colors ${
                index === selectedIndex ? 'bg-ink-elevated' : 'hover:bg-ink-soft'
              }`}
            >
              {/* Step number */}
              <span className="flex-shrink-0 w-6 h-6 bg-accent text-ink text-xs font-bold rounded-full flex items-center justify-center mt-0.5">
                {index + 1}
              </span>

              {/* Title (editable) */}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={step.title}
                  onChange={(e) => handleEditTitle(index, e.target.value)}
                  className="w-full bg-transparent text-text-primary text-sm outline-none"
                />
                {step.description && (
                  <p className="text-text-tertiary text-xs mt-0.5 truncate">
                    {step.description}
                  </p>
                )}
                <p className="text-text-tertiary text-[10px] mt-0.5">
                  {step.app.name || step.app.windowTitle}
                </p>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveUp(index) }}
                  disabled={index === 0}
                  className="text-text-tertiary hover:text-text-primary disabled:opacity-30 text-xs p-1"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleMoveDown(index) }}
                  disabled={index === steps.length - 1}
                  className="text-text-tertiary hover:text-text-primary disabled:opacity-30 text-xs p-1"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteStep(index) }}
                  className="text-text-tertiary hover:text-danger text-xs p-1"
                  title={t('review.deleteStep')}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right panel — screenshot preview (40%) */}
        <div className="w-2/5 flex items-center justify-center bg-ink-soft p-4">
          {selectedStep?.thumbnailDataUrl ? (
            <img
              src={selectedStep.thumbnailDataUrl}
              alt={selectedStep.title}
              className="max-w-full max-h-full rounded-lg shadow-lg"
            />
          ) : (
            <div className="text-text-tertiary text-sm text-center">
              <p>{t('review.screenshotPreview')}</p>
              <p className="text-xs mt-1">{t('review.screenshotAvailable')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer — actions */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-border">
        <div className="flex gap-3">
          <button
            onClick={() => setShowDiscardConfirm(true)}
            className="text-text-secondary text-sm hover:text-danger transition-colors"
          >
            {t('review.discard')}
          </button>
          <span className="text-text-tertiary text-xs self-center">
            {t('review.stepsCount', { count: steps.length })}
          </span>
        </div>
        <button
          onClick={handleSave}
          className="bg-accent hover:bg-accent-hover text-ink font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          {t('review.save')}
        </button>
      </div>

      {/* Discard confirmation */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-ink-elevated rounded-xl p-6 max-w-sm mx-4">
            <p className="text-text-primary text-sm mb-4">{t('review.discardConfirm')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="text-text-secondary text-sm hover:text-text-primary transition-colors"
              >
                {t('review.cancel')}
              </button>
              <button
                onClick={onDiscard}
                className="bg-danger text-white text-sm font-medium py-1.5 px-4 rounded-lg"
              >
                {t('review.discard')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

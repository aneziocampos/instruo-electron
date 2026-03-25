export const en = {
  'auth.signIn': 'Sign in',
  'auth.signingIn': 'Waiting for sign-in in your browser...',
  'auth.timeout': 'Sign-in timed out. Please try again.',
  'auth.cancel': 'Cancel',
  'auth.tryAgain': 'Try again',
  'auth.tagline': 'Record step-by-step guides from any app',

  'idle.startRecording': 'Start Recording',
  'idle.hotkey': 'Ctrl+Shift+R',
  'idle.signOut': 'Sign out',
  'idle.usage': '{used} of {limit} guides',
  'idle.usageUnlimited': '{used} guides',
  'idle.welcome': 'Welcome, {name}',
  'idle.plan': '{plan} plan',

  'recording.countdown.title': 'Recording starts in...',
  'recording.countdown.cancel': 'Press Esc to cancel',
  'recording.stopped': 'Recording stopped',
  'recording.limitReached': 'Maximum {max} steps reached.',

  'review.title': 'Review your guide',
  'review.guideTitle': 'Guide title',
  'review.aiWriter': 'AI Writer',
  'review.guideType': 'Guide type',
  'review.team': 'Team',
  'review.linear': 'Linear',
  'review.interactive': 'Interactive',
  'review.save': 'Save guide',
  'review.discard': 'Discard',
  'review.discardConfirm': 'Discard this recording? This cannot be undone.',
  'review.noSteps': 'No steps recorded.',
  'review.recordAgain': 'Record again',
  'review.step': 'Step {n}',
  'review.deleteStep': 'Delete step',

  'upload.uploading': 'Uploading step {current} of {total}...',
  'upload.failed': 'Upload failed. Please try again.',
  'upload.retry': 'Retry',

  'success.title': 'Guide created!',
  'success.description': 'Your guide with {count} steps has been created.',
  'success.viewOnline': 'View on instruo.ai',
  'success.recordAnother': 'Record another',
  'success.aiPolishing': 'AI is polishing your guide. Titles may be updated shortly.',

  'error.network': 'Network error. Check your connection.',
  'error.planLimit': 'You\'ve reached your plan\'s guide limit.',
  'error.upgrade': 'Upgrade plan',

  'lgpd.title': 'Screen Recording Notice',
  'lgpd.message': 'Instruo captures screenshots of your entire screen during recording. This may include personal data visible in other applications. Please ensure no sensitive information is displayed before starting.',
  'lgpd.acknowledge': 'I understand'
} as const

export type TranslationKey = keyof typeof en

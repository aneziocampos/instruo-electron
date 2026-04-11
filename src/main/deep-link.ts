import log from 'electron-log'
import * as authManager from './auth-manager'

export function handleDeepLink(url: string): void {
  log.info('Deep link received:', url.replace(/token=[^&]+/, 'token=REDACTED'))

  try {
    const parsed = new URL(url)
    const path = parsed.hostname || parsed.pathname.replace(/^\/\//, '')

    if (path === 'auth') {
      handleAuthDeepLink(parsed)
    } else {
      log.warn('Unknown deep link path:', path)
    }
  } catch (error) {
    log.error('Failed to parse deep link:', error)
  }
}

async function handleAuthDeepLink(parsed: URL): Promise<void> {
  const token = parsed.searchParams.get('token')
  const state = parsed.searchParams.get('state')

  if (!token || !state) {
    log.warn('Auth deep link missing token or state')
    return
  }

  // Validate CSRF state parameter
  if (!authManager.validateAndConsumeState(state)) {
    log.warn('Auth deep link state mismatch — possible CSRF or duplicate')
    return
  }

  // If already authenticated, ignore
  if (authManager.getToken()) {
    log.info('Already authenticated, ignoring auth deep link')
    return
  }

  authManager.setToken(token)

  // Notify renderer
  const { getMainWindow } = await import('./index')
  const mainWindow = getMainWindow()
  if (mainWindow) {
    mainWindow.webContents.send('auth:authenticated')
  }

  log.info('Desktop auth completed successfully')
}

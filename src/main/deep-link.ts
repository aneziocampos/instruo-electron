import log from 'electron-log'
import * as authManager from './auth-manager'
import { exchangeAuthCode } from './api-client'

export function handleDeepLink(url: string): void {
  log.info('Deep link received:', url.replace(/code=[^&]+/, 'code=REDACTED'))

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

function handleAuthDeepLink(parsed: URL): void {
  const code = parsed.searchParams.get('code')
  const state = parsed.searchParams.get('state')

  if (!code || !state) {
    log.warn('Auth deep link missing code or state')
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

  // Exchange authorization code for token
  exchangeCodeForToken(code)
}

async function exchangeCodeForToken(code: string): Promise<void> {
  try {
    const token = await exchangeAuthCode(code)
    authManager.setToken(token)

    // Notify renderer — import getMainWindow lazily to avoid circular dependency
    const { getMainWindow } = await import('./index')
    const mainWindow = getMainWindow()
    if (mainWindow) {
      mainWindow.webContents.send('auth:authenticated')
    }

    log.info('Auth code exchanged successfully')
  } catch (error) {
    log.error('Failed to exchange auth code:', error)
  }
}

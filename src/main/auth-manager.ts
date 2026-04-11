import { safeStorage } from 'electron'
import Store from 'electron-store'
import { randomBytes } from 'crypto'
import { clearSteps } from './step-store'

const store = new Store<{ encryptedToken: string | null }>({
  name: 'auth',
  defaults: { encryptedToken: null }
})

// Pending state parameters for CSRF protection (Set-based to handle multiple sign-in attempts)
const pendingStates = new Set<string>()

let cachedToken: string | null = null

export function getToken(): string | null {
  if (cachedToken) return cachedToken

  const encrypted = store.get('encryptedToken')
  if (!encrypted) return null

  try {
    const buffer = Buffer.from(encrypted, 'base64')
    cachedToken = safeStorage.decryptString(buffer)
    return cachedToken
  } catch {
    store.set('encryptedToken', null)
    return null
  }
}

export function setToken(token: string): void {
  cachedToken = token
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(token)
    store.set('encryptedToken', encrypted.toString('base64'))
  } else {
    // In dev, allow unencrypted fallback. In production, refuse to persist.
    const { is } = require('@electron-toolkit/utils')
    if (is.dev) {
      store.set('encryptedToken', Buffer.from(token).toString('base64'))
    }
    // Production without safeStorage: token stays in memory only (cachedToken)
  }
}

export function clearToken(): void {
  cachedToken = null
  store.set('encryptedToken', null)
}

export function signOut(): void {
  clearToken()
  pendingStates.clear()
  clearSteps()
}

export function generateState(): string {
  const state = randomBytes(32).toString('hex')
  pendingStates.add(state)
  return state
}

export function validateAndConsumeState(state: string): boolean {
  return pendingStates.delete(state)
}

import { writeFile, unlink, mkdir, access, readFile } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'
import log from 'electron-log'
import type { CapturedStep, StepThumbnail } from '../shared/types'

const THUMBNAIL_WIDTH = 200

const SESSION_DIR = join(app.getPath('temp'), 'instruo-session')
const SESSION_FILE = join(SESSION_DIR, 'session.jsonl')

let steps: CapturedStep[] = []
let persistTimer: ReturnType<typeof setTimeout> | null = null

// --- Public API ---

export function getSteps(): CapturedStep[] {
  return steps
}

export function getStepCount(): number {
  return steps.length
}

export function addStep(step: CapturedStep): void {
  steps.push(step)
  schedulePersist()
}

export function upgradeLastStepToDoubleClick(): boolean {
  if (steps.length === 0) return false
  steps[steps.length - 1].actionType = 'doubleClick'
  schedulePersist()
  return true
}

export function clearSteps(): void {
  steps = []
  cancelPersist()
  cleanupSessionDir().catch((e) => log.error('Failed to cleanup session dir:', e))
}

export async function getStepThumbnails(): Promise<StepThumbnail[]> {
  return Promise.all(steps.map(async (s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    actionType: s.actionType,
    thumbnailDataUrl: await generateThumbnail(s.screenshotPath),
    app: s.app
  })))
}

async function generateThumbnail(screenshotPath: string): Promise<string> {
  try {
    const sharp = require('sharp')
    const resized = await sharp(screenshotPath)
      .resize({ width: THUMBNAIL_WIDTH })
      .jpeg({ quality: 70 })
      .toBuffer()
    return `data:image/jpeg;base64,${resized.toString('base64')}`
  } catch {
    try {
      const raw = await readFile(screenshotPath)
      return `data:image/jpeg;base64,${raw.toString('base64')}`
    } catch {
      return ''
    }
  }
}

// --- Persistence (JSONL, debounced 1/sec) ---

function schedulePersist(): void {
  if (persistTimer) return
  persistTimer = setTimeout(() => {
    persistTimer = null
    persistSession().catch((e) => log.error('Failed to persist session:', e))
  }, 1000)
}

function cancelPersist(): void {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
}

async function persistSession(): Promise<void> {
  await mkdir(SESSION_DIR, { recursive: true })
  const lines = steps.map((s) => JSON.stringify({
    id: s.id,
    timestamp: s.timestamp,
    title: s.title,
    description: s.description,
    actionType: s.actionType,
    typedValue: s.typedValue,
    element: s.element,
    screenshotPath: s.screenshotPath,
    click: s.click,
    screen: s.screen,
    app: s.app
  }))
  await writeFile(SESSION_FILE, lines.join('\n') + '\n')
}

async function cleanupSessionDir(): Promise<void> {
  try {
    await access(SESSION_FILE).then(() => unlink(SESSION_FILE)).catch(() => {})
  } catch {
    // Ignore cleanup errors
  }
}

// --- Flush on demand (before upload or stop) ---

export async function flush(): Promise<void> {
  cancelPersist()
  if (steps.length > 0) {
    await persistSession()
  }
}

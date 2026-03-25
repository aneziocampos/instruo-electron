import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'
import log from 'electron-log'
import {
  CLICK_CIRCLE_RADIUS,
  CLICK_CIRCLE_FILL,
  CLICK_CIRCLE_STROKE,
  CLICK_CIRCLE_OUTER_STROKE,
  HIGHLIGHT_LINE_WIDTH,
  SCREENSHOT_JPEG_QUALITY
} from '../shared/constants'

const SESSION_DIR = join(app.getPath('temp'), 'instruo-session')
let sessionDirReady = false

async function ensureSessionDir(): Promise<void> {
  if (sessionDirReady) return
  await mkdir(SESSION_DIR, { recursive: true })
  sessionDirReady = true
}

export function resetSessionDir(): void {
  sessionDirReady = false
}

/**
 * Annotate a screenshot with a red click circle and save to temp file.
 * P2: Accepts width/height from caller — no double JPEG decode.
 */
export async function annotateAndSave(
  buffer: Buffer,
  clickX: number,
  clickY: number,
  stepId: string,
  imgWidth: number,
  imgHeight: number
): Promise<string> {
  await ensureSessionDir()
  const outputPath = join(SESSION_DIR, `${stepId}.jpg`)

  try {
    // sharp is optional — graceful fallback below if not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = require('sharp')

    const radius = CLICK_CIRCLE_RADIUS
    const strokeWidth = HIGHLIGHT_LINE_WIDTH

    const svg = `<svg width="${imgWidth}" height="${imgHeight}">
      <circle cx="${clickX}" cy="${clickY}" r="${radius + strokeWidth}"
        fill="none" stroke="${CLICK_CIRCLE_OUTER_STROKE}" stroke-width="2" opacity="0.8"/>
      <circle cx="${clickX}" cy="${clickY}" r="${radius}"
        fill="${CLICK_CIRCLE_FILL}" stroke="${CLICK_CIRCLE_STROKE}" stroke-width="${strokeWidth}"/>
    </svg>`

    await sharp(buffer)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .jpeg({ quality: SCREENSHOT_JPEG_QUALITY })
      .toFile(outputPath)

    return outputPath
  } catch {
    log.warn('sharp not available, saving screenshot without annotation')
    await writeFile(outputPath, buffer)
    return outputPath
  }
}

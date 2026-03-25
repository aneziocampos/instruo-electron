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

/**
 * Annotate a screenshot buffer with a red click circle and save to temp file.
 * Uses SVG overlay composited onto the JPEG via sharp (if available)
 * or falls back to saving the raw JPEG without annotation.
 */
export async function annotateAndSave(
  buffer: Buffer,
  clickX: number,
  clickY: number,
  stepId: string
): Promise<string> {
  await mkdir(SESSION_DIR, { recursive: true })
  const outputPath = join(SESSION_DIR, `${stepId}.jpg`)

  try {
    // Try using sharp for annotation
    const sharp = require('sharp')

    const radius = CLICK_CIRCLE_RADIUS
    const strokeWidth = HIGHLIGHT_LINE_WIDTH

    // Create SVG circle overlay
    const metadata = await sharp(buffer).metadata()
    const imgWidth = metadata.width || 1920
    const imgHeight = metadata.height || 1080

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
    // Fallback: save raw JPEG without annotation (sharp not installed)
    log.warn('sharp not available, saving screenshot without annotation')
    await writeFile(outputPath, buffer)
    return outputPath
  }
}

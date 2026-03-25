import { desktopCapturer, screen } from 'electron'
import log from 'electron-log'
import { SCREENSHOT_JPEG_QUALITY } from '../shared/constants'

/**
 * Capture a screenshot of the display containing the given screen coordinates.
 * Returns JPEG buffer and display metadata.
 */
export async function captureScreenshot(
  clickX: number,
  clickY: number
): Promise<{
  buffer: Buffer
  displayId: string
  width: number
  height: number
} | null> {
  try {
    // Find which display contains the click point
    const display = screen.getDisplayNearestPoint({ x: clickX, y: clickY })
    const displayId = display.id.toString()

    // Get all screen sources
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: display.size.width, height: display.size.height }
    })

    // Match source to display by ID
    const source = sources.find((s) => s.display_id === displayId) || sources[0]
    if (!source) {
      log.warn('No screen source found for screenshot')
      return null
    }

    // Convert NativeImage thumbnail to JPEG buffer
    const buffer = source.thumbnail.toJPEG(SCREENSHOT_JPEG_QUALITY)

    return {
      buffer,
      displayId,
      width: display.size.width,
      height: display.size.height
    }
  } catch (error) {
    log.error('Screenshot capture failed:', error)
    return null
  }
}

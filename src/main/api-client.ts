import { readFile } from 'fs/promises'
import log from 'electron-log'
import { API_BASE_URL, APP_BASE_URL } from '../shared/constants'
import { AuthError } from '../shared/errors'
import type { CapturedStep, GuideUploadParams, GuideResponse, UsageResponse } from '../shared/types'
import * as authManager from './auth-manager'

// --- Core Fetch Wrapper ---

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = authManager.getToken()
  if (!token) throw new AuthError('No auth token', 401)

  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  })

  if (response.status === 401) {
    authManager.clearToken()
    throw new AuthError('Token expired or invalid', 401)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`API ${response.status}: ${body}`)
  }

  return response
}

interface UsageApiResponse {
  user: { name: string; email: string }
  plan: { name: string; guide_limit: number | null; guides_used: number }
  ai_writers: Array<{ id: string | number; name: string; is_custom: boolean }>
  default_ai_writer: string | null
}

export async function fetchUsage(): Promise<UsageResponse> {
  const response = await apiFetch('/usage')
  const data = (await response.json()) as Partial<UsageApiResponse>
  if (!data.user?.email || !data.plan?.name) {
    throw new Error('Invalid usage response: missing required fields')
  }

  return {
    user: { name: data.user.name ?? '', email: data.user.email },
    plan: {
      name: data.plan!.name,
      guideLimit: data.plan!.guide_limit ?? null,
      guidesUsed: data.plan!.guides_used ?? 0
    },
    aiWriters: (data.ai_writers ?? []).map((w) => ({
      id: String(w.id),
      name: w.name,
      isCustom: w.is_custom
    })),
    defaultAiWriter: data.default_ai_writer ?? null
  }
}

// --- Guide Creation ---

async function createGuide(
  params: GuideUploadParams,
  expectedStepsCount: number
): Promise<string> {
  const body: Record<string, unknown> = {
    title: params.title,
    source: 'desktop',
    expected_steps_count: expectedStepsCount
  }

  if (params.guideType) body.guide_type = params.guideType
  if (params.customAiWriterId) {
    body.custom_ai_writer_id = params.customAiWriterId
  } else if (params.aiWriter) {
    body.ai_writer = params.aiWriter
  }
  if (params.teamId) body.company_id = params.teamId

  const response = await apiFetch('/guides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  const data = (await response.json()) as { guide?: { public_slug?: string } }
  if (!data.guide?.public_slug) {
    throw new Error('Invalid guide response: missing public_slug')
  }
  return data.guide.public_slug
}

// --- Step Upload ---

async function uploadStep(guideSlug: string, step: CapturedStep): Promise<void> {
  const formData = new FormData()
  formData.append('step[title]', step.title)

  if (step.description) {
    formData.append('step[description]', step.description)
  }

  if (step.click.x != null) {
    formData.append('step[click_x]', String(step.click.x))
    formData.append('step[click_y]', String(step.click.y))
    formData.append('step[viewport_width]', String(step.screen.width))
    formData.append('step[viewport_height]', String(step.screen.height))
  }

  // Read screenshot from temp file
  if (step.screenshotPath) {
    const buffer = await readFile(step.screenshotPath)
    const blob = new Blob([buffer], { type: 'image/jpeg' })
    formData.append('step[screenshot]', blob, `step-${step.id}.jpg`)
  }

  await apiFetch(`/guides/${guideSlug}/steps`, {
    method: 'POST',
    body: formData
  })
}

// --- Full Guide Upload (with retry + progress) ---

export type UploadProgressCallback = (uploaded: number, total: number) => void

export async function uploadGuide(
  params: GuideUploadParams,
  steps: CapturedStep[],
  onProgress?: UploadProgressCallback
): Promise<GuideResponse> {
  const guideSlug = await createGuide(params, steps.length)

  for (let i = 0; i < steps.length; i++) {
    let lastError: Error | null = null

    // Per-step retry: 3 attempts with exponential backoff
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await uploadStep(guideSlug, steps[i])
        lastError = null
        break
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (error instanceof AuthError) throw error // Don't retry auth errors

        if (attempt < 2) {
          const delay = Math.pow(2, attempt) * 1000
          log.warn(`Step ${i} upload failed (attempt ${attempt + 1}), retrying in ${delay}ms`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    if (lastError) {
      throw lastError
    }

    onProgress?.(i + 1, steps.length)
  }

  return {
    slug: guideSlug,
    url: `${APP_BASE_URL}/guides/${guideSlug}`
  }
}

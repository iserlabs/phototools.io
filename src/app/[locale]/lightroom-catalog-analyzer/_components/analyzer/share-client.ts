import { gzip } from 'pako'
import type { InsightBlob, AnalysisFilter } from '@/lib/lrcat/types'

export type ShareErrorKind = 'rate-limited' | 'storage-unavailable' | 'invalid' | 'unknown'

export class ShareError extends Error {
  constructor(public readonly kind: ShareErrorKind) {
    super(`Share failed: ${kind}`)
    this.name = 'ShareError'
  }
}

export type ExpiresIn = '24h' | '7d' | '30d'

export interface CreateShareResult {
  id: string
  url: string
  expiresAt: string
  filterContext?: AnalysisFilter
}

/** Gzip the current InsightBlob and POST it to /api/share. */
export async function createShare(blob: InsightBlob, expiresIn: ExpiresIn): Promise<CreateShareResult> {
  const payload = JSON.stringify({ blob, expiresIn })
  const gz = gzip(payload)

  let resp: Response
  try {
    resp = await fetch('/api/share', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-encoding': 'gzip' },
      body: gz,
    })
  } catch {
    throw new ShareError('unknown')
  }

  if (!resp.ok) {
    if (resp.status === 429) throw new ShareError('rate-limited')
    if (resp.status === 503) throw new ShareError('storage-unavailable')
    if (resp.status === 400) throw new ShareError('invalid')
    throw new ShareError('unknown')
  }

  const json = (await resp.json()) as { id: string; url: string; expiresAt: string }
  return { ...json, filterContext: blob.filterContext }
}

/** DELETE a share by id. Resolves regardless of 404 (idempotent from the UI's view). */
export async function deleteShare(id: string): Promise<void> {
  try {
    await fetch(`/api/share/${id}`, { method: 'DELETE' })
  } catch {
    /* best-effort; localStorage cleanup happens regardless */
  }
}

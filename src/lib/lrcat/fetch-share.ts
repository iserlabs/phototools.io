import 'server-only'
import { gunzipSync } from 'node:zlib'
import { resolveShareBlob } from './share-blob'
import { insightBlobSchema } from './insight-blob.schema'
import { logger } from '@/lib/logger'
import type { InsightBlob } from './types'

/** Highest InsightBlob schemaVersion this viewer build understands. */
export const VIEWER_SCHEMA_VERSION = 1
const ID_RE = /^[A-Za-z0-9_-]{16}$/

export type FetchShareResult =
  | { status: 'found'; blob: InsightBlob; expiresAtIso: string }
  | { status: 'not-found' }
  | { status: 'schema-newer'; foundVersion: number }

/**
 * Server-side: resolve a share id to its InsightBlob.
 * Gunzips, version-checks, then Zod-validates. Never throws on bad input —
 * maps everything to a typed status the page renders.
 */
export async function fetchShare(id: string): Promise<FetchShareResult> {
  if (!ID_RE.test(id)) return { status: 'not-found' }

  let found
  try {
    found = await resolveShareBlob(id)
  } catch (err) {
    logger.error('share', 'Recipient fetch failed', { id, error: err instanceof Error ? err : String(err) })
    return { status: 'not-found' }
  }
  if (!found) return { status: 'not-found' }
  if (new Date(found.expiresAtIso).getTime() < Date.now()) return { status: 'not-found' }

  let parsed: { meta?: { schemaVersion?: number } }
  try {
    parsed = JSON.parse(gunzipSync(Buffer.from(found.bytes)).toString('utf8'))
  } catch (err) {
    logger.error('share', 'Recipient gunzip/parse failed', { id, error: err instanceof Error ? err : String(err) })
    return { status: 'not-found' }
  }

  const version = parsed.meta?.schemaVersion
  if (typeof version === 'number' && version > VIEWER_SCHEMA_VERSION) {
    logger.warn('share', 'Recipient saw newer schema', { id, version })
    return { status: 'schema-newer', foundVersion: version }
  }

  const validated = insightBlobSchema.safeParse(parsed)
  if (!validated.success) {
    logger.warn('share', 'Recipient blob failed schema', { id })
    return { status: 'not-found' }
  }

  return { status: 'found', blob: validated.data as unknown as InsightBlob, expiresAtIso: found.expiresAtIso }
}

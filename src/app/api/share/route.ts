import { type NextRequest, NextResponse } from 'next/server'
import { gzipSync, gunzipSync } from 'node:zlib'
import { nanoid } from 'nanoid'
import { logger } from '@/lib/logger'
import { decodeShareBody, MAX_DECOMPRESSED_BYTES } from './decode'
import { putShareBlob } from '@/lib/lrcat/share-blob'
import type { InsightBlob } from '@/lib/lrcat/types'

// Node.js runtime: zlib + @vercel/blob SDK need Node APIs.
export const runtime = 'nodejs'
// Never cache a creation endpoint.
export const dynamic = 'force-dynamic'

const EXPIRY_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
} as const
type ExpiresIn = keyof typeof EXPIRY_MS

const ID_LENGTH = 16

export async function POST(request: NextRequest): Promise<NextResponse> {
  // The wire payload is { blob, expiresIn } — possibly gzipped as a whole.
  const raw = await request.arrayBuffer()
  const encoding = request.headers.get('content-encoding')

  // Gunzip the WHOLE wrapper first, then validate the inner blob through the
  // same strict decode helper used by the standalone decode path.
  const decoded = await decodeShareWrapper(raw, encoding)
  if (!decoded.ok) {
    logger.warn('share', 'Rejected share POST', { reason: decoded.reason })
    return NextResponse.json({ error: decoded.reason }, { status: 400 })
  }

  const { blob, expiresIn } = decoded
  const now = Date.now()
  const expiresAtMs = now + EXPIRY_MS[expiresIn]
  const expiresAtIso = new Date(expiresAtMs).toISOString()
  const id = nanoid(ID_LENGTH)

  // Re-gzip the validated blob for storage (we store gzipped JSON).
  const storedBytes = gzipSync(Buffer.from(JSON.stringify(blob)))

  try {
    const { url } = await putShareBlob(id, storedBytes, expiresAtIso)
    logger.info('share', 'Created share', { id, expiresIn, expiresAt: expiresAtIso })
    return NextResponse.json({ id, url, expiresAt: expiresAtIso }, { status: 200 })
  } catch (err) {
    logger.error('share', 'Blob put failed', { id, error: err instanceof Error ? err : String(err) })
    return NextResponse.json({ error: 'storage-unavailable' }, { status: 503 })
  }
}

// --- outer wrapper decode ---------------------------------------------------

type WrapperResult =
  | { ok: true; blob: InsightBlob; expiresIn: ExpiresIn }
  | { ok: false; reason: string }

async function decodeShareWrapper(body: ArrayBuffer, encoding: string | null): Promise<WrapperResult> {
  if (body.byteLength > MAX_DECOMPRESSED_BYTES) return { ok: false, reason: 'too-large' }

  let jsonBytes: Buffer
  const input = Buffer.from(body)
  if ((encoding ?? '').toLowerCase().includes('gzip')) {
    try {
      jsonBytes = gunzipSync(input, { maxOutputLength: MAX_DECOMPRESSED_BYTES })
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code
      return { ok: false, reason: code === 'ERR_BUFFER_TOO_LARGE' ? 'too-large' : 'bad-gzip' }
    }
  } else {
    jsonBytes = input
  }

  let parsed: { blob?: unknown; expiresIn?: unknown }
  try {
    parsed = JSON.parse(jsonBytes.toString('utf8'))
  } catch {
    return { ok: false, reason: 'invalid-json' }
  }

  const expiresIn = parsed.expiresIn
  if (expiresIn !== '24h' && expiresIn !== '7d' && expiresIn !== '30d') {
    return { ok: false, reason: 'invalid-expiry' }
  }

  // Re-serialize the inner blob and run it through the strict decode helper so
  // we get identical Zod validation as the standalone decode path.
  const inner = await decodeShareBody(
    new TextEncoder().encode(JSON.stringify(parsed.blob)).buffer,
    null,
  )
  if (!inner.ok) return { ok: false, reason: inner.reason }

  return { ok: true, blob: inner.blob, expiresIn }
}

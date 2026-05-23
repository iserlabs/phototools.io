import { inflateSync, gunzipSync } from 'node:zlib'
import { insightBlobSchema } from '@/lib/lrcat/insight-blob.schema'
import type { InsightBlob } from '@/lib/lrcat/types'

/** Hard cap on the DECOMPRESSED payload — prevents gzip bombs. */
export const MAX_DECOMPRESSED_BYTES = 256 * 1024

export type DecodeFailure =
  | 'too-large'      // decompressed payload exceeds the cap
  | 'bad-gzip'       // gzip stream is corrupt / undecodable
  | 'invalid-json'   // decompressed bytes are not valid JSON
  | 'invalid-schema' // JSON does not satisfy insightBlobSchema

export type DecodeResult =
  | { ok: true; blob: InsightBlob }
  | { ok: false; reason: DecodeFailure }

/**
 * Decode and validate a share request body.
 *
 * If `contentEncoding` indicates gzip we gunzip with a hard decompressed-size
 * cap; otherwise we treat the bytes as plain JSON (still capped). The result
 * is validated against the InsightBlob Zod schema (loose passthrough on nested
 * blocks, strict on meta.schemaVersion === 1) before we ever touch storage.
 *
 * Pure & side-effect free so the gzip-bomb and schema paths are unit-testable.
 */
export async function decodeShareBody(
  body: ArrayBuffer,
  contentEncoding: string | null,
): Promise<DecodeResult> {
  // Reject obviously over-sized COMPRESSED payloads up front (a legitimate
  // gzipped 80 KB blob is well under this; a 256 KB+ compressed body is abuse).
  if (body.byteLength > MAX_DECOMPRESSED_BYTES) {
    return { ok: false, reason: 'too-large' }
  }

  let jsonBytes: Buffer
  const input = Buffer.from(body)
  const isGzip = (contentEncoding ?? '').toLowerCase().includes('gzip')

  if (isGzip) {
    try {
      // maxOutputLength enforces the decompressed cap at the zlib layer — the
      // stream aborts the moment output would exceed the cap (no full inflate).
      jsonBytes = gunzipSync(input, { maxOutputLength: MAX_DECOMPRESSED_BYTES })
    } catch (err) {
      // Node throws ERR_BUFFER_TOO_LARGE when maxOutputLength is exceeded; any
      // other error means a malformed stream. Distinguish so the route can map
      // to the right status code / log line.
      const code = (err as NodeJS.ErrnoException)?.code
      if (code === 'ERR_BUFFER_TOO_LARGE') return { ok: false, reason: 'too-large' }
      // Some clients send raw DEFLATE; try once before declaring it bad.
      try {
        jsonBytes = inflateSync(input, { maxOutputLength: MAX_DECOMPRESSED_BYTES })
      } catch {
        return { ok: false, reason: 'bad-gzip' }
      }
    }
  } else {
    jsonBytes = input
    if (jsonBytes.byteLength > MAX_DECOMPRESSED_BYTES) {
      return { ok: false, reason: 'too-large' }
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonBytes.toString('utf8'))
  } catch {
    return { ok: false, reason: 'invalid-json' }
  }

  const validated = insightBlobSchema.safeParse(parsed)
  if (!validated.success) {
    return { ok: false, reason: 'invalid-schema' }
  }

  // validated.data is structurally a superset; cast to the canonical type.
  return { ok: true, blob: validated.data as unknown as InsightBlob }
}

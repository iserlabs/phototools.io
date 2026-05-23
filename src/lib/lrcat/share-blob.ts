import 'server-only'
import { put, list, del } from '@vercel/blob'

const PREFIX = 'share/'
const ID_RE = /^[A-Za-z0-9_-]{16}$/

function token(): string | undefined {
  // Vercel auto-injects BLOB_READ_WRITE_TOKEN in deployed environments;
  // passing it explicitly keeps local/test runs deterministic.
  return process.env.BLOB_READ_WRITE_TOKEN
}

export interface ResolvedShare {
  pathname: string
  expiresAtIso: string
  url: string
  bytes: Uint8Array
}

/** Write the gzipped JSON share to `share/{expiresAtIso}/{id}.json`. */
export async function putShareBlob(
  id: string,
  gzBytes: Uint8Array,
  expiresAtIso: string,
): Promise<{ url: string; pathname: string }> {
  const pathname = `${PREFIX}${expiresAtIso}/${id}.json`
  // gzBytes is always a Node Buffer at runtime (gzipSync output). Buffer is a
  // Uint8Array subclass; the cast satisfies @vercel/blob's PutBody type.
  const res = await put(pathname, gzBytes as unknown as Buffer, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    token: token(),
    // Bytes are immutable once written; let the CDN cache hard.
    cacheControlMaxAge: 60 * 60 * 24 * 30,
  })
  return { url: res.url, pathname: res.pathname }
}

/** Find a share by its 16-char id, returning pathname + decoded expiry + bytes. */
export async function resolveShareBlob(id: string): Promise<ResolvedShare | null> {
  if (!ID_RE.test(id)) return null
  const suffix = `/${id}.json`

  let cursor: string | undefined
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000, token: token() })
    for (const blob of page.blobs) {
      if (!blob.pathname.endsWith(suffix)) continue
      const m = blob.pathname.match(/^share\/([^/]+)\//)
      const expiresAtIso = m ? m[1] : ''
      const resp = await fetch(blob.url)
      if (!resp.ok) return null
      const bytes = new Uint8Array(await resp.arrayBuffer())
      return { pathname: blob.pathname, expiresAtIso, url: blob.url, bytes }
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)

  return null
}

/** Delete a single share by its full pathname. */
export async function deleteShareBlob(pathname: string): Promise<void> {
  await del(pathname, { token: token() })
}

/** List every pathname under `share/`, paginating to completion. */
export async function listSharePathnames(): Promise<string[]> {
  const out: string[] = []
  let cursor: string | undefined
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000, token: token() })
    for (const blob of page.blobs) out.push(blob.pathname)
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  return out
}

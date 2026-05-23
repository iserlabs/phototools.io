import { describe, expect, it, vi, beforeEach } from 'vitest'
import { gunzipSync } from 'node:zlib'
import { createShare, ShareError } from './share-client'
import type { InsightBlob } from '@/lib/lrcat/types'

function tinyBlob(): InsightBlob {
  // Cast — the helper only serializes; shape isn't validated client-side.
  return { meta: { schemaVersion: 1, totalPhotos: 3 } } as unknown as InsightBlob
}

beforeEach(() => vi.restoreAllMocks())

describe('createShare', () => {
  it('gzips the payload and POSTs to /api/share', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      // Decompress what the client sent and assert it round-trips.
      const sent = gunzipSync(Buffer.from(init.body as ArrayBuffer))
      const parsed = JSON.parse(sent.toString('utf8'))
      expect(parsed.expiresIn).toBe('7d')
      expect(parsed.blob.meta.totalPhotos).toBe(3)
      return { ok: true, status: 200, json: async () => ({ id: 'abcd1234abcd1234', url: 'https://x/r/abcd1234abcd1234', expiresAt: '2099-01-01T00:00:00.000Z' }) } as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await createShare(tinyBlob(), '7d')
    expect(res.id).toBe('abcd1234abcd1234')
    const [, init] = fetchMock.mock.calls[0]
    expect((init.headers as Record<string, string>)['content-encoding']).toBe('gzip')
  })

  it('throws ShareError("rate-limited") on 429', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }) as Response))
    await expect(createShare(tinyBlob(), '30d')).rejects.toMatchObject({ kind: 'rate-limited' })
  })

  it('throws ShareError("storage-unavailable") on 503', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }) as Response))
    await expect(createShare(tinyBlob(), '24h')).rejects.toBeInstanceOf(ShareError)
  })

  it('throws ShareError("unknown") on other errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response))
    await expect(createShare(tinyBlob(), '24h')).rejects.toMatchObject({ kind: 'unknown' })
  })
})

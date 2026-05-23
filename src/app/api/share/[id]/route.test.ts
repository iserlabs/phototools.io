import { describe, expect, it, vi, beforeEach } from 'vitest'
import { gzipSync } from 'node:zlib'

const futureIso = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
const pastIso = new Date(Date.now() - 1000).toISOString()

vi.mock('@/lib/lrcat/share-blob', () => ({
  resolveShareBlob: vi.fn(),
  deleteShareBlob: vi.fn(async () => undefined),
}))

import { GET, DELETE } from './route'
import { resolveShareBlob, deleteShareBlob } from '@/lib/lrcat/share-blob'

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  ;(resolveShareBlob as ReturnType<typeof vi.fn>).mockReset()
  ;(deleteShareBlob as ReturnType<typeof vi.fn>).mockReset()
})

describe('GET /api/share/[id]', () => {
  it('returns the gzipped blob bytes for a live share', async () => {
    const bytes = gzipSync(Buffer.from(JSON.stringify({ hello: 'world' })))
    ;(resolveShareBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      pathname: `share/${futureIso}/abcd1234abcd1234.json`,
      expiresAtIso: futureIso,
      url: 'https://blob.example/x',
      bytes: new Uint8Array(bytes),
    })
    const res = await GET(new Request('https://x/api/share/abcd1234abcd1234'), ctx('abcd1234abcd1234'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-encoding')).toBe('gzip')
  })

  it('404s an unknown id', async () => {
    ;(resolveShareBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    const res = await GET(new Request('https://x/api/share/missing000000000'), ctx('missing000000000'))
    expect(res.status).toBe(404)
  })

  it('404s an expired share (encoded expiry in the past)', async () => {
    ;(resolveShareBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      pathname: `share/${pastIso}/expired000000000.json`,
      expiresAtIso: pastIso,
      url: 'https://blob.example/x',
      bytes: new Uint8Array(gzipSync(Buffer.from('{}'))),
    })
    const res = await GET(new Request('https://x/api/share/expired000000000'), ctx('expired000000000'))
    expect(res.status).toBe(404)
  })

  it('rejects a malformed id (wrong length / charset)', async () => {
    const res = await GET(new Request('https://x/api/share/../etc'), ctx('../etc'))
    expect(res.status).toBe(400)
    expect(resolveShareBlob).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/share/[id]', () => {
  it('deletes a known share and returns 200', async () => {
    ;(resolveShareBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      pathname: `share/${futureIso}/abcd1234abcd1234.json`,
      expiresAtIso: futureIso,
      url: 'https://blob.example/x',
      bytes: new Uint8Array(0),
    })
    const res = await DELETE(new Request('https://x', { method: 'DELETE' }), ctx('abcd1234abcd1234'))
    expect(res.status).toBe(200)
    expect(deleteShareBlob).toHaveBeenCalledWith(`share/${futureIso}/abcd1234abcd1234.json`)
  })

  it('404s deleting an unknown id', async () => {
    ;(resolveShareBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    const res = await DELETE(new Request('https://x', { method: 'DELETE' }), ctx('missing000000000'))
    expect(res.status).toBe(404)
    expect(deleteShareBlob).not.toHaveBeenCalled()
  })
})

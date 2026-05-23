import { describe, expect, it, vi, beforeEach } from 'vitest'

const futureIso = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
const pastIso = new Date(Date.now() - 3600 * 1000).toISOString()

vi.mock('@/lib/lrcat/share-blob', () => ({
  listSharePathnames: vi.fn(),
  deleteShareBlob: vi.fn(async () => undefined),
}))

import { GET } from './route'
import { listSharePathnames, deleteShareBlob } from '@/lib/lrcat/share-blob'

function req(authHeader?: string) {
  return new Request('https://x/api/cron/expire-shares', {
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

beforeEach(() => {
  ;(listSharePathnames as ReturnType<typeof vi.fn>).mockReset()
  ;(deleteShareBlob as ReturnType<typeof vi.fn>).mockReset()
  ;(deleteShareBlob as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
  vi.stubEnv('CRON_SECRET', 'test-secret')
})

describe('GET /api/cron/expire-shares', () => {
  it('rejects without a bearer token', async () => {
    const res = await GET(req())
    expect(res.status).toBe(401)
    expect(listSharePathnames).not.toHaveBeenCalled()
  })

  it('rejects a wrong bearer token', async () => {
    const res = await GET(req('Bearer nope'))
    expect(res.status).toBe(401)
  })

  it('deletes only past-due shares', async () => {
    ;(listSharePathnames as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      `share/${pastIso}/aaaaaaaaaaaaaaaa.json`,
      `share/${futureIso}/bbbbbbbbbbbbbbbb.json`,
      `share/${pastIso}/cccccccccccccccc.json`,
    ])
    const res = await GET(req('Bearer test-secret'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.deleted).toBe(2)
    expect(deleteShareBlob).toHaveBeenCalledTimes(2)
    expect(deleteShareBlob).toHaveBeenCalledWith(`share/${pastIso}/aaaaaaaaaaaaaaaa.json`)
    expect(deleteShareBlob).toHaveBeenCalledWith(`share/${pastIso}/cccccccccccccccc.json`)
  })

  it('ignores malformed pathnames safely', async () => {
    ;(listSharePathnames as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      'share/not-a-date/zzzz.json',
      `share/${pastIso}/dddddddddddddddd.json`,
    ])
    const res = await GET(req('Bearer test-secret'))
    const json = await res.json()
    expect(json.deleted).toBe(1)
  })

  it('reports zero deletions on an empty store', async () => {
    ;(listSharePathnames as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])
    const res = await GET(req('Bearer test-secret'))
    const json = await res.json()
    expect(json.deleted).toBe(0)
  })
})

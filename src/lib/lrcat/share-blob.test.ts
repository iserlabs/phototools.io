import { describe, expect, it, vi, beforeEach } from 'vitest'

const putMock = vi.fn()
const listMock = vi.fn()
const delMock = vi.fn()

vi.mock('@vercel/blob', () => ({
  put: (...args: unknown[]) => putMock(...args),
  list: (...args: unknown[]) => listMock(...args),
  del: (...args: unknown[]) => delMock(...args),
}))

import { putShareBlob, resolveShareBlob, deleteShareBlob, listSharePathnames } from './share-blob'

const futureIso = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()

beforeEach(() => {
  // Reset clears both call history AND any queued *Once implementations so a
  // leftover queued value from a prior test can't shift this test's mocks.
  putMock.mockReset()
  listMock.mockReset()
  delMock.mockReset()
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'test-token')
})

describe('putShareBlob', () => {
  it('writes to share/{iso}/{id}.json with public access and no random suffix', async () => {
    putMock.mockResolvedValueOnce({ url: 'https://blob.example/share/x/abc.json', pathname: `share/${futureIso}/abcd1234abcd1234.json` })
    const out = await putShareBlob('abcd1234abcd1234', new Uint8Array([1, 2, 3]), futureIso)
    expect(out.url).toContain('blob.example')
    const [pathname, body, opts] = putMock.mock.calls[0]
    expect(pathname).toBe(`share/${futureIso}/abcd1234abcd1234.json`)
    expect(body).toBeInstanceOf(Uint8Array)
    expect(opts).toMatchObject({ access: 'public', addRandomSuffix: false, contentType: 'application/json' })
  })
})

describe('resolveShareBlob', () => {
  it('finds a blob by id suffix and fetches its bytes', async () => {
    listMock.mockResolvedValueOnce({
      blobs: [
        { pathname: `share/${futureIso}/abcd1234abcd1234.json`, url: 'https://blob.example/abc' },
      ],
      hasMore: false,
      cursor: undefined,
    })
    const fetchMock = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([9, 9, 9]).buffer }))
    vi.stubGlobal('fetch', fetchMock)

    const found = await resolveShareBlob('abcd1234abcd1234')
    expect(found).not.toBeNull()
    expect(found!.expiresAtIso).toBe(futureIso)
    expect(found!.pathname).toBe(`share/${futureIso}/abcd1234abcd1234.json`)
    expect(Array.from(found!.bytes)).toEqual([9, 9, 9])
    expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ prefix: 'share/' }))
  })

  it('returns null when no blob matches the id', async () => {
    listMock.mockResolvedValueOnce({ blobs: [], hasMore: false, cursor: undefined })
    expect(await resolveShareBlob('missing000000000')).toBeNull()
  })

  it('paginates through multiple list pages', async () => {
    listMock
      .mockResolvedValueOnce({ blobs: [{ pathname: `share/${futureIso}/aaaaaaaaaaaaaaaa.json`, url: 'u1' }], hasMore: true, cursor: 'c1' })
      .mockResolvedValueOnce({ blobs: [{ pathname: `share/${futureIso}/target1234target.json`, url: 'u2' }], hasMore: false, cursor: undefined })
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([1]).buffer })))
    const found = await resolveShareBlob('target1234target')
    expect(found).not.toBeNull()
    expect(listMock).toHaveBeenCalledTimes(2)
  })
})

describe('deleteShareBlob', () => {
  it('calls del with the pathname', async () => {
    delMock.mockResolvedValueOnce(undefined)
    await deleteShareBlob(`share/${futureIso}/abcd1234abcd1234.json`)
    expect(delMock).toHaveBeenCalledWith(`share/${futureIso}/abcd1234abcd1234.json`, expect.anything())
  })
})

describe('listSharePathnames', () => {
  it('returns every pathname under share/ across pages', async () => {
    listMock
      .mockResolvedValueOnce({ blobs: [{ pathname: 'share/a/1.json' }], hasMore: true, cursor: 'c1' })
      .mockResolvedValueOnce({ blobs: [{ pathname: 'share/b/2.json' }], hasMore: false, cursor: undefined })
    const all = await listSharePathnames()
    expect(all).toEqual(['share/a/1.json', 'share/b/2.json'])
  })
})

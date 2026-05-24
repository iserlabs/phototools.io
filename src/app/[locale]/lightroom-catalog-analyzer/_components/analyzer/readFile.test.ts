import { describe, expect, it } from 'vitest'
import { readCatalogBytes } from './readFile'

function fileOf(bytes: Uint8Array<ArrayBuffer>, name = 'Lightroom Catalog.lrcat'): File {
  return new File([bytes], name, { type: 'application/x-sqlite3' })
}

describe('readCatalogBytes', () => {
  it('reads the exact bytes of a small file', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 250, 0, 128])
    const buf = await readCatalogBytes(fileOf(bytes))
    expect(new Uint8Array(buf)).toEqual(bytes)
  })

  it('reads an empty file as a zero-length buffer', async () => {
    const buf = await readCatalogBytes(fileOf(new Uint8Array(0)))
    expect(buf.byteLength).toBe(0)
  })

  it('reassembles a multi-chunk file in order (streamed read)', async () => {
    // ~3 MB exercises the chunked stream path (browsers hand back many chunks).
    const bytes = new Uint8Array(3 * 1024 * 1024)
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251
    const buf = await readCatalogBytes(fileOf(bytes))
    const out = new Uint8Array(buf)
    expect(out.length).toBe(bytes.length)
    expect(out[0]).toBe(0)
    expect(out[bytes.length - 1]).toBe((bytes.length - 1) % 251)
    expect(out[1_500_000]).toBe(1_500_000 % 251)
  })
})

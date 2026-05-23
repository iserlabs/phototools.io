import { describe, expect, it } from 'vitest'
import { computeCatalogHash } from './hash'

describe('computeCatalogHash', () => {
  it('returns a 64-char hex SHA-256', async () => {
    const buf = new ArrayBuffer(128)
    new Uint8Array(buf).fill(0x42)
    const hash = await computeCatalogHash(buf, 12345, 1700000000000)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is stable across calls with same inputs', async () => {
    const buf = new ArrayBuffer(64)
    new Uint8Array(buf).fill(0x01)
    const a = await computeCatalogHash(buf, 1, 2)
    const b = await computeCatalogHash(buf, 1, 2)
    expect(a).toBe(b)
  })

  it('changes when size differs', async () => {
    const buf = new ArrayBuffer(64)
    new Uint8Array(buf).fill(0x01)
    const a = await computeCatalogHash(buf, 1, 2)
    const b = await computeCatalogHash(buf, 999, 2)
    expect(a).not.toBe(b)
  })

  it('changes when lastModified differs', async () => {
    const buf = new ArrayBuffer(64)
    new Uint8Array(buf).fill(0x01)
    const a = await computeCatalogHash(buf, 1, 2)
    const b = await computeCatalogHash(buf, 1, 999)
    expect(a).not.toBe(b)
  })

  it('only hashes first 64 KB of the buffer', async () => {
    // Two buffers identical in first 64 KB but differing afterward should produce the same hash.
    const big1 = new ArrayBuffer(128 * 1024)
    const big2 = new ArrayBuffer(128 * 1024)
    new Uint8Array(big1).fill(0x11)
    new Uint8Array(big2).fill(0x11)
    // diverge after 64 KB
    new Uint8Array(big2, 64 * 1024, 1024).fill(0xff)
    const a = await computeCatalogHash(big1, 99, 100)
    const b = await computeCatalogHash(big2, 99, 100)
    expect(a).toBe(b)
  })
})

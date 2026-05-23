import { describe, expect, it, beforeEach } from 'vitest'
import {
  appendShare, listActiveShares, removeShare, summarizeFilter,
  SHARE_STORAGE_KEY, MAX_SHARE_RECORDS,
  type ShareRecord,
} from './share-storage'

function rec(id: string, expiresInMs: number, createdAt = Date.now()): ShareRecord {
  return { id, url: `https://x/r/${id}`, createdAt, expiresAt: Date.now() + expiresInMs }
}

beforeEach(() => {
  localStorage.clear()
})

describe('share-storage', () => {
  it('appends and lists a record', () => {
    appendShare(rec('aaaaaaaaaaaaaaaa', 1e7))
    const list = listActiveShares()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('aaaaaaaaaaaaaaaa')
  })

  it('prunes expired records on read', () => {
    appendShare(rec('expired0000000000', -1000)) // already expired
    appendShare(rec('liveaaaaaaaaaaaa', 1e7))
    const list = listActiveShares()
    expect(list.map((r) => r.id)).toEqual(['liveaaaaaaaaaaaa'])
  })

  it('removes a record by id', () => {
    appendShare(rec('aaaaaaaaaaaaaaaa', 1e7))
    appendShare(rec('bbbbbbbbbbbbbbbb', 1e7))
    removeShare('aaaaaaaaaaaaaaaa')
    expect(listActiveShares().map((r) => r.id)).toEqual(['bbbbbbbbbbbbbbbb'])
  })

  it('keeps newest-first ordering', () => {
    appendShare(rec('older00000000000', 1e7, Date.now() - 5000))
    appendShare(rec('newer00000000000', 1e7, Date.now()))
    expect(listActiveShares()[0].id).toBe('newer00000000000')
  })

  it('evicts the oldest beyond MAX_SHARE_RECORDS (LRU)', () => {
    for (let i = 0; i < MAX_SHARE_RECORDS + 5; i++) {
      appendShare(rec(`id${String(i).padStart(14, '0')}`, 1e7, Date.now() + i))
    }
    const list = listActiveShares()
    expect(list.length).toBe(MAX_SHARE_RECORDS)
    // The very first inserted (oldest) should be gone.
    expect(list.find((r) => r.id === 'id00000000000000')).toBeUndefined()
  })

  it('survives corrupt JSON in storage', () => {
    localStorage.setItem(SHARE_STORAGE_KEY, '{not valid json')
    expect(listActiveShares()).toEqual([])
    appendShare(rec('recoveraaaaaaaaa', 1e7))
    expect(listActiveShares()).toHaveLength(1)
  })

  it('de-duplicates by id (re-append updates in place)', () => {
    appendShare(rec('dupeaaaaaaaaaaaa', 1e7))
    appendShare(rec('dupeaaaaaaaaaaaa', 2e7))
    const list = listActiveShares()
    expect(list).toHaveLength(1)
  })
})

describe('summarizeFilter', () => {
  it('summarizes a single-dimension filter', () => {
    expect(summarizeFilter({ cameras: ['Sony A7R V'] })).toContain('Sony A7R V')
  })

  it('counts multiple dimensions compactly', () => {
    const s = summarizeFilter({ cameras: ['A', 'B'], ratings: [4, 5], dateRange: { start: '2024-01-01', end: '2024-12-31' } })
    expect(s).toMatch(/cameras/i)
    expect(s).toMatch(/ratings/i)
  })

  it('returns an empty string for an empty filter', () => {
    expect(summarizeFilter({})).toBe('')
  })
})

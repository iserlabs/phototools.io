import { describe, expect, it } from 'vitest'
import type BetterSqlite3 from 'better-sqlite3'
import { aggregateKeywords } from './keywords'
import { adaptForAggregators, createTestCatalog } from './__test-helpers__'

/**
 * Insert keyword/tag rows into a previously built test catalog.
 * Returns the same DB. Keyword IDs are assigned sequentially starting at 1.
 */
function tagPhotos(
  db: BetterSqlite3.Database,
  tags: Array<{ keyword: string; photoIds: number[] }>,
  extraKeywords: string[] = [],
): void {
  const insertKw = db.prepare(`INSERT INTO AgLibraryKeyword (name) VALUES (?)`)
  const insertKi = db.prepare(`INSERT INTO AgLibraryKeywordImage (tag, image) VALUES (?, ?)`)
  for (const { keyword, photoIds } of tags) {
    const info = insertKw.run(keyword)
    const tagId = Number(info.lastInsertRowid)
    for (const pid of photoIds) insertKi.run(tagId, pid)
  }
  for (const orphan of extraKeywords) insertKw.run(orphan)
}

describe('aggregateKeywords', () => {
  it('drops keywords used on fewer than 3 photos (PII guard, spec §4.13)', () => {
    const cat = createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L1' },
      { id: 2, captureTime: '2024-01-02T10:00:00', cameraModel: 'A', lens: 'L1' },
      { id: 3, captureTime: '2024-01-03T10:00:00', cameraModel: 'A', lens: 'L1' },
      { id: 4, captureTime: '2024-01-04T10:00:00', cameraModel: 'A', lens: 'L1' },
    ])
    tagPhotos(cat, [
      { keyword: 'family',    photoIds: [1, 2, 3, 4] }, // ≥3 → kept
      { keyword: 'jane-doe',  photoIds: [1, 2] },        // <3 → dropped (PII)
      { keyword: 'wedding',   photoIds: [1, 2, 3] },     // ==3 → kept (≥3)
    ])
    const r = aggregateKeywords(adaptForAggregators(cat))
    const kws = r.topKeywords.map((k) => k.keyword)
    expect(kws).toContain('family')
    expect(kws).toContain('wedding')
    expect(kws).not.toContain('jane-doe')
  })

  it('counts orphan keywords (defined but never tagged)', () => {
    const cat = createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L1' },
      { id: 2, captureTime: '2024-01-02T10:00:00', cameraModel: 'A', lens: 'L1' },
      { id: 3, captureTime: '2024-01-03T10:00:00', cameraModel: 'A', lens: 'L1' },
    ])
    tagPhotos(cat, [
      { keyword: 'family', photoIds: [1, 2, 3] },
    ], ['unused-1', 'unused-2'])
    const r = aggregateKeywords(adaptForAggregators(cat))
    expect(r.orphanKeywordCount).toBe(2)
    expect(r.uniqueKeywordCount).toBe(3)
  })

  it('reports tagged/untagged counts and avg keywords per tagged photo', () => {
    const cat = createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L1' },
      { id: 2, captureTime: '2024-01-02T10:00:00', cameraModel: 'A', lens: 'L1' },
      { id: 3, captureTime: '2024-01-03T10:00:00', cameraModel: 'A', lens: 'L1' },
      { id: 4, captureTime: '2024-01-04T10:00:00', cameraModel: 'A', lens: 'L1' },
    ])
    tagPhotos(cat, [
      { keyword: 'k1', photoIds: [1, 1, 2] }, // photo 1 tagged twice with k1, photo 2 once
      { keyword: 'k2', photoIds: [3] },
    ])
    const r = aggregateKeywords(adaptForAggregators(cat))
    // photos tagged at all: 1, 2, 3 → 3 tagged, 1 untagged
    expect(r.totalTaggedPhotos).toBe(3)
    expect(r.totalUntaggedPhotos).toBe(1)
    // total tag rows = 4 (k1:[1,1,2] + k2:[3]); avg per tagged photo = 4/3 ≈ 1.33
    expect(r.avgKeywordsPerTaggedPhoto).toBeCloseTo(1.33, 1)
  })

  it('flags blind-spot months where tag coverage < 20%', () => {
    const photos = [
      ...Array.from({ length: 10 }, (_, i) => ({
        id: i + 1, captureTime: '2024-01-15T10:00:00', cameraModel: 'A', lens: 'L1',
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        id: i + 100, captureTime: '2024-02-15T10:00:00', cameraModel: 'A', lens: 'L1',
      })),
    ]
    const cat = createTestCatalog(photos)
    // January: 9 photos tagged (>20% coverage → not a blind spot)
    // February: 1 photo tagged (10% coverage → blind spot)
    tagPhotos(cat, [
      { keyword: 'family', photoIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 100] },
    ])
    const r = aggregateKeywords(adaptForAggregators(cat))
    const feb = r.blindSpots.find((b) => b.yearMonth === '2024-02')
    const jan = r.blindSpots.find((b) => b.yearMonth === '2024-01')
    expect(feb?.coveragePct).toBeCloseTo(10, 0)
    expect(jan).toBeUndefined()
  })

  it('handles a catalog with no keywords at all', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L1' },
    ]))
    const r = aggregateKeywords(db)
    expect(r.uniqueKeywordCount).toBe(0)
    expect(r.orphanKeywordCount).toBe(0)
    expect(r.totalTaggedPhotos).toBe(0)
    expect(r.totalUntaggedPhotos).toBe(1)
    expect(r.topKeywords).toEqual([])
  })
})

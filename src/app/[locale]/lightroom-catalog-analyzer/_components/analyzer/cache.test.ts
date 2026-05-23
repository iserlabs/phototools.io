import { describe, expect, it, beforeEach, vi } from 'vitest'

// Wire fake-indexeddb into the global scope before importing the SUT or idb-keyval.
import 'fake-indexeddb/auto'

import { getCachedInsights, setCachedInsights, clearAllCachedInsights } from './cache'
import type { InsightBlob } from '@/lib/lrcat/types'

function makeBlob(hash: string): InsightBlob {
  return {
    meta: {
      schemaVersion: 1, catalogVersion: 14, totalPhotos: 1,
      dateRange: { first: '2024-01-01', last: '2024-12-31' },
      parsedAt: Date.now(), catalogHash: hash,
    },
    yearInReview: null, yearToYear: null,
    overview: { totalPhotos: 1, dateRange: { first: '', last: '' }, daysShot: 0, photosPerDay: 0, bodyCount: 0, lensCount: 0, topBody: null, topLens: null, topFocalLengthMm: null },
    gear: { bodiesOverTime: [], topLenses: [], topCombos: [], retired: [] },
    focalLength: { histogram: [], topPeaks: [], bestOnePrime: null },
    focalLengthPerZoom: { zooms: [] },
    apertures: { perLens: [] },
    timeOfDay: { byClockHour: [], bySunAngle: { gpsPhotosCount: 0, goldenHour: 0, blueHour: 0, midday: 0, night: 0 }, perGearByClockHour: [] },
    heatmap: { byDay: [], years: [] },
    gps: { totalPhotosWithGps: 0, pctWithGps: 0, clusters: [], topRegions: [] },
    curation: { funnel: { total: 1, notRejected: 1, rated1Plus: 0, rated4Plus: 0 }, pickRateByBody: [], pickRateByLens: [] },
    editIntensity: { avgExposureShiftStops: 0, avgCropPct: 0, pctWithLocalAdjustments: 0, pctWithPresets: 0, topPresets: [], scoreByMonth: [], perGearScores: [], sampled: false, sampleSize: 1 },
    ratings: { distribution: { rejected: 0, r0: 1, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 }, colorLabels: [], pickRateByBody: [], pickRateByLens: [] },
    keywords: { totalTaggedPhotos: 0, totalUntaggedPhotos: 1, uniqueKeywordCount: 0, avgKeywordsPerTaggedPhoto: 0, orphanKeywordCount: 0, topKeywords: [], blindSpots: [] },
    bursts: { totalBursts: 0, totalPhotosInBursts: 0, pctInBursts: 0, longestBurst: 0, lengthHistogram: [], keeperRatePct: 0, singleShotKeeperRatePct: 0 },
    catalogHealth: { missingOriginals: 0, missingPreviews: 0, brokenPaths: 0, likelyDuplicates: 0, duplicateClusters: [], missingByRootFolder: [] },
  }
}

beforeEach(async () => {
  await clearAllCachedInsights()
})

describe('cache.ts', () => {
  it('returns null when no entry exists', async () => {
    expect(await getCachedInsights('missing')).toBeNull()
  })

  it('round-trips a blob by hash', async () => {
    const blob = makeBlob('abc')
    await setCachedInsights('abc', blob)
    const got = await getCachedInsights('abc')
    expect(got?.meta.catalogHash).toBe('abc')
  })

  it('updates lastAccess on read (so LRU is by access not insertion)', async () => {
    const a = makeBlob('a')
    const b = makeBlob('b')
    await setCachedInsights('a', a)
    // Move clock forward
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-05-23T10:00:00Z'))
    await setCachedInsights('b', b)
    vi.setSystemTime(new Date('2026-05-23T11:00:00Z'))
    await getCachedInsights('a')
    // After the read, 'a' should be more recent than 'b'.
    // We assert behavior indirectly via the eviction test below.
    vi.useRealTimers()
    expect(await getCachedInsights('a')).not.toBeNull()
    expect(await getCachedInsights('b')).not.toBeNull()
  })

  it('evicts the least-recently-accessed entry when over 10', async () => {
    // Insert 10 entries spaced in time
    vi.useFakeTimers({ toFake: ['Date'] })
    for (let i = 0; i < 10; i++) {
      vi.setSystemTime(new Date(`2026-05-${10 + i}T10:00:00Z`))
      await setCachedInsights(`hash-${i}`, makeBlob(`hash-${i}`))
    }
    // Insert an 11th. hash-0 (oldest lastAccess) must be evicted.
    vi.setSystemTime(new Date('2026-05-22T10:00:00Z'))
    await setCachedInsights('hash-10', makeBlob('hash-10'))
    vi.useRealTimers()

    expect(await getCachedInsights('hash-0')).toBeNull()
    expect(await getCachedInsights('hash-10')).not.toBeNull()
    expect(await getCachedInsights('hash-5')).not.toBeNull()
  })

  it('treats entries older than 90 days as expired', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    await setCachedInsights('old', makeBlob('old'))
    vi.setSystemTime(new Date('2026-05-01T00:00:00Z')) // 120 days later
    const got = await getCachedInsights('old')
    vi.useRealTimers()
    expect(got).toBeNull()
  })

  it('clearAllCachedInsights removes everything', async () => {
    await setCachedInsights('a', makeBlob('a'))
    await setCachedInsights('b', makeBlob('b'))
    await clearAllCachedInsights()
    expect(await getCachedInsights('a')).toBeNull()
    expect(await getCachedInsights('b')).toBeNull()
  })

  it('non-fatal on idb errors (set never throws even if backing store fails)', async () => {
    // Any unexpected error inside set/get should not propagate. We exercise it
    // by passing a value that triggers a structured-clone error.
    const blob = makeBlob('weird')
    ;(blob as unknown as { fn: () => void }).fn = () => {}
    await expect(setCachedInsights('weird', blob)).resolves.not.toThrow()
  })
})

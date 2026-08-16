import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

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

// ── Deterministic clock ──
//
// `getCachedInsights` re-evaluates the 90-day TTL against `Date.now()` on every
// read, so any assertion that runs under the REAL clock ages each seeded entry
// by however long ago its hardcoded date was. These cases used to seed at fixed
// May-2026 dates and then call `vi.useRealTimers()` *before* asserting, which
// meant they silently began failing once wall-clock time passed those dates +
// 90 days — a test-authoring bug, not a cache bug. Two rules keep that from
// coming back:
//
//   1. Every instant is derived from BASE, never written as a literal date, so
//      the suite behaves identically whenever it runs.
//   2. Fake time stays pinned through the assertions; only `afterEach` restores
//      the real clock.
//
// `toFake: ['Date']` is deliberate and load-bearing — faking timers wholesale
// would stall the promise scheduling that fake-indexeddb and idb-keyval rely
// on, hanging every await in this file.
const BASE_MS = Date.parse('2026-05-10T10:00:00Z')
const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
/** An instant `offsetMs` after BASE. */
const at = (offsetMs: number): Date => new Date(BASE_MS + offsetMs)

/** Pin Date to BASE + offset. Only `Date` is faked — see the note above. */
function pinClock(offsetMs = 0): void {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(at(offsetMs))
}

beforeEach(async () => {
  await clearAllCachedInsights()
})

afterEach(() => {
  vi.useRealTimers()
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
    pinClock()
    await setCachedInsights('a', makeBlob('a'))
    // Move clock forward
    vi.setSystemTime(at(HOUR_MS))
    await setCachedInsights('b', makeBlob('b'))
    vi.setSystemTime(at(2 * HOUR_MS))
    await getCachedInsights('a')
    // After the read, 'a' should be more recent than 'b'.
    // We assert behavior indirectly via the eviction test below.
    expect(await getCachedInsights('a')).not.toBeNull()
    expect(await getCachedInsights('b')).not.toBeNull()
  })

  it('evicts the least-recently-accessed entry when over 10', async () => {
    // Insert 10 entries one day apart. Every offset stays well inside the
    // 90-day TTL, so eviction is the only thing that can remove an entry —
    // otherwise this would be asserting expiry while claiming to test LRU.
    pinClock()
    for (let i = 0; i < 10; i++) {
      vi.setSystemTime(at(i * DAY_MS))
      await setCachedInsights(`hash-${i}`, makeBlob(`hash-${i}`))
    }
    // Insert an 11th. hash-0 (oldest lastAccess) must be evicted.
    vi.setSystemTime(at(10 * DAY_MS))
    await setCachedInsights('hash-10', makeBlob('hash-10'))

    expect(await getCachedInsights('hash-0')).toBeNull()
    expect(await getCachedInsights('hash-10')).not.toBeNull()
    expect(await getCachedInsights('hash-5')).not.toBeNull()
  })

  it('treats entries older than 90 days as expired', async () => {
    pinClock()
    await setCachedInsights('old', makeBlob('old'))
    vi.setSystemTime(at(120 * DAY_MS))
    expect(await getCachedInsights('old')).toBeNull()
  })

  // Boundary guard for the TTL that this suite's own bug hid: an entry read
  // just before the 90-day cutoff must survive. Without this, an off-by-one or
  // a unit slip in TTL_MS that expires everything early would still pass the
  // "expired" case above.
  it('keeps an entry read just under the 90-day TTL', async () => {
    pinClock()
    await setCachedInsights('fresh', makeBlob('fresh'))
    vi.setSystemTime(at(90 * DAY_MS - MINUTE_MS))
    expect(await getCachedInsights('fresh')).not.toBeNull()
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

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { gzipSync } from 'node:zlib'

vi.mock('./share-blob', () => ({ resolveShareBlob: vi.fn() }))
import { fetchShare, VIEWER_SCHEMA_VERSION } from './fetch-share'
import { resolveShareBlob } from './share-blob'

function validBlobObject() {
  return {
    meta: { schemaVersion: 1, catalogVersion: 14, totalPhotos: 10, dateRange: { first: '2024-01-01', last: '2024-12-31' }, parsedAt: 1700000000000, catalogHash: 'a'.repeat(64) },
    yearInReview: null, yearToYear: null,
    overview: { totalPhotos: 10, dateRange: { first: '2024-01-01', last: '2024-12-31' }, daysShot: 5, photosPerDay: 2, bodyCount: 1, lensCount: 1, topBody: 'Sony A7R V', topLens: '24-70mm', topFocalLengthMm: 35 },
    gear: { bodiesOverTime: [], topLenses: [], topCombos: [], retired: [] },
    focalLength: { histogram: [], topPeaks: [], bestOnePrime: null },
    focalLengthPerZoom: { zooms: [] }, apertures: { perLens: [] },
    timeOfDay: { byClockHour: [], bySunAngle: { gpsPhotosCount: 0, goldenHour: 0, blueHour: 0, midday: 0, night: 0 }, perGearByClockHour: [] },
    heatmap: { byDay: [], years: [2024] },
    gps: { totalPhotosWithGps: 0, pctWithGps: 0, clusters: [], topRegions: [] },
    curation: { funnel: { total: 10, notRejected: 10, rated1Plus: 4, rated4Plus: 2 }, pickRateByBody: [], pickRateByLens: [] },
    editIntensity: { avgExposureShiftStops: 0, avgCropPct: 0, pctWithLocalAdjustments: 0, pctWithPresets: 0, topPresets: [], scoreByMonth: [], perGearScores: [], sampled: false, sampleSize: 0 },
    ratings: { distribution: { rejected: 0, r0: 6, r1: 0, r2: 0, r3: 2, r4: 1, r5: 1 }, colorLabels: [], pickRateByBody: [], pickRateByLens: [] },
    keywords: { totalTaggedPhotos: 0, totalUntaggedPhotos: 10, uniqueKeywordCount: 0, avgKeywordsPerTaggedPhoto: 0, orphanKeywordCount: 0, topKeywords: [], blindSpots: [] },
    bursts: { totalBursts: 0, totalPhotosInBursts: 0, pctInBursts: 0, longestBurst: 0, lengthHistogram: [], keeperRatePct: 0, singleShotKeeperRatePct: 0 },
    catalogHealth: { missingOriginals: 0, missingPreviews: 0, brokenPaths: 0, likelyDuplicates: 0, duplicateClusters: [], missingByRootFolder: [] },
  }
}

const futureIso = new Date(Date.now() + 1e7).toISOString()
function resolved(obj: unknown) {
  return { pathname: `share/${futureIso}/x.json`, expiresAtIso: futureIso, url: 'u', bytes: new Uint8Array(gzipSync(Buffer.from(JSON.stringify(obj)))) }
}

beforeEach(() => {
  // Reset clears queued *Once values so a leftover from a prior test can't
  // shift this test's mock (repo config sets clearMocks/restoreMocks globally).
  ;(resolveShareBlob as ReturnType<typeof vi.fn>).mockReset()
})

describe('fetchShare', () => {
  it('returns found + the blob for a valid share', async () => {
    ;(resolveShareBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce(resolved(validBlobObject()))
    const res = await fetchShare('abcd1234abcd1234')
    expect(res.status).toBe('found')
    if (res.status === 'found') expect(res.blob.meta.totalPhotos).toBe(10)
  })

  it('returns not-found for a missing id', async () => {
    ;(resolveShareBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    const res = await fetchShare('missing0000000000')
    expect(res.status).toBe('not-found')
  })

  it('returns schema-newer when meta.schemaVersion exceeds the viewer version', async () => {
    const blob = validBlobObject()
    ;(blob.meta as { schemaVersion: number }).schemaVersion = VIEWER_SCHEMA_VERSION + 1
    // bypass schema by storing raw (schema would reject; we want the version-branch)
    ;(resolveShareBlob as ReturnType<typeof vi.fn>).mockResolvedValueOnce(resolved(blob))
    const res = await fetchShare('abcd1234abcd1234')
    expect(res.status).toBe('schema-newer')
  })

  it('returns not-found for a malformed id', async () => {
    const res = await fetchShare('../etc/passwd')
    expect(res.status).toBe('not-found')
    expect(resolveShareBlob).not.toHaveBeenCalled()
  })
})

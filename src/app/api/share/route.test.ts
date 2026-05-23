import { describe, expect, it, vi, beforeEach } from 'vitest'
import { gzipSync } from 'node:zlib'

// Mock the Blob storage layer — no network in unit tests.
vi.mock('@/lib/lrcat/share-blob', () => ({
  putShareBlob: vi.fn(async (id: string, _gz: Uint8Array, expiresAtIso: string) => ({
    url: `https://blob.example/share/${expiresAtIso}/${id}.json`,
    pathname: `share/${expiresAtIso}/${id}.json`,
  })),
}))

import { POST } from './route'
import { putShareBlob } from '@/lib/lrcat/share-blob'

function validBlobObject() {
  return {
    meta: { schemaVersion: 1, catalogVersion: 14, totalPhotos: 10, dateRange: { first: '2024-01-01', last: '2024-12-31' }, parsedAt: 1700000000000, catalogHash: 'a'.repeat(64) },
    yearInReview: null, yearToYear: null,
    overview: { totalPhotos: 10, dateRange: { first: '2024-01-01', last: '2024-12-31' }, daysShot: 5, photosPerDay: 2, bodyCount: 1, lensCount: 1, topBody: 'Sony A7R V', topLens: '24-70mm', topFocalLengthMm: 35 },
    gear: { bodiesOverTime: [], topLenses: [], topCombos: [], retired: [] },
    focalLength: { histogram: [], topPeaks: [], bestOnePrime: null },
    focalLengthPerZoom: { zooms: [] },
    apertures: { perLens: [] },
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

function gzReq(obj: unknown, expiresIn: string) {
  const payload = { blob: obj, expiresIn }
  const gz = gzipSync(Buffer.from(JSON.stringify(payload)))
  return new Request('https://www.phototools.io/api/share', {
    method: 'POST',
    headers: { 'content-encoding': 'gzip', 'content-type': 'application/json' },
    body: gz,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/share', () => {
  it('creates a share and returns a url + 16-char id + expiresAt', async () => {
    const res = await POST(gzReq(validBlobObject(), '30d') as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toMatch(/^[A-Za-z0-9_-]{16}$/)
    expect(json.url).toContain(json.id)
    expect(new Date(json.expiresAt).getTime()).toBeGreaterThan(Date.now())
    expect(putShareBlob).toHaveBeenCalledOnce()
  })

  it('encodes expiration in the blob pathname', async () => {
    await POST(gzReq(validBlobObject(), '24h') as never)
    const [, , expiresAtIso] = (putShareBlob as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]
    // ~24h from now (allow 1 min skew)
    const delta = new Date(expiresAtIso as string).getTime() - Date.now()
    expect(delta).toBeGreaterThan(23.9 * 3600 * 1000)
    expect(delta).toBeLessThan(24.1 * 3600 * 1000)
  })

  it('rejects an unknown expiresIn value', async () => {
    const res = await POST(gzReq(validBlobObject(), '90d') as never)
    expect(res.status).toBe(400)
    expect(putShareBlob).not.toHaveBeenCalled()
  })

  it('rejects an invalid blob with 400', async () => {
    const bad = validBlobObject()
    ;(bad.meta as { schemaVersion: number }).schemaVersion = 99
    const res = await POST(gzReq(bad, '7d') as never)
    expect(res.status).toBe(400)
    expect(putShareBlob).not.toHaveBeenCalled()
  })

  it('returns 503 when Blob storage throws', async () => {
    ;(putShareBlob as unknown as { mockRejectedValueOnce: (e: Error) => void }).mockRejectedValueOnce(new Error('blob down'))
    const res = await POST(gzReq(validBlobObject(), '30d') as never)
    expect(res.status).toBe(503)
  })
})

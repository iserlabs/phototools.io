import { describe, expect, it } from 'vitest'
import { gzipSync } from 'node:zlib'
import { decodeShareBody, MAX_DECOMPRESSED_BYTES } from './decode'
import type { InsightBlob } from '@/lib/lrcat/types'

function minimalBlob(): InsightBlob {
  return {
    meta: {
      schemaVersion: 1,
      catalogVersion: 14,
      totalPhotos: 10,
      dateRange: { first: '2024-01-01', last: '2024-12-31' },
      parsedAt: 1700000000000,
      catalogHash: 'a'.repeat(64),
    },
    yearInReview: null,
    yearToYear: null,
    overview: {
      totalPhotos: 10, dateRange: { first: '2024-01-01', last: '2024-12-31' },
      daysShot: 5, photosPerDay: 2, bodyCount: 1, lensCount: 1,
      topBody: 'Sony A7R V', topLens: '24-70mm', topFocalLengthMm: 35,
    },
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

function gz(obj: unknown): ArrayBuffer {
  const buf = gzipSync(Buffer.from(JSON.stringify(obj)))
  // Return a standalone ArrayBuffer (not a view into a pooled Buffer).
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

describe('decodeShareBody', () => {
  it('decodes a gzipped valid blob', async () => {
    const blob = minimalBlob()
    const res = await decodeShareBody(gz(blob), 'gzip')
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.blob.meta.totalPhotos).toBe(10)
  })

  it('decodes a plain (non-gzipped) JSON body', async () => {
    const blob = minimalBlob()
    const raw = new TextEncoder().encode(JSON.stringify(blob)).buffer
    const res = await decodeShareBody(raw, null)
    expect(res.ok).toBe(true)
  })

  it('rejects a blob with the wrong schemaVersion', async () => {
    const bad = minimalBlob()
    ;(bad.meta as { schemaVersion: number }).schemaVersion = 2
    const res = await decodeShareBody(gz(bad), 'gzip')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('invalid-schema')
  })

  it('rejects non-JSON garbage', async () => {
    const raw = new TextEncoder().encode('not json at all {{{').buffer
    const res = await decodeShareBody(raw, null)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('invalid-json')
  })

  it('rejects a gzip bomb that exceeds the decompressed cap', async () => {
    // 1 MB of zeros gzips to a few KB but decompresses past the 256 KB cap.
    const bomb = gzipSync(Buffer.alloc(1024 * 1024, 0))
    const ab = bomb.buffer.slice(bomb.byteOffset, bomb.byteOffset + bomb.byteLength)
    const res = await decodeShareBody(ab, 'gzip')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('too-large')
  })

  it('rejects corrupt gzip data', async () => {
    const raw = new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0xff, 0xff, 0xff]).buffer
    const res = await decodeShareBody(raw, 'gzip')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('bad-gzip')
  })

  it('exposes a 256 KB cap constant', () => {
    expect(MAX_DECOMPRESSED_BYTES).toBe(256 * 1024)
  })
})

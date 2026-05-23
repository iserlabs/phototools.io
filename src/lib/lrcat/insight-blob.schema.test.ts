import { describe, expect, it } from 'vitest'
import { insightBlobSchema } from './insight-blob.schema'
import type { InsightBlob } from './types'

function minimalBlob(): InsightBlob {
  return {
    meta: {
      schemaVersion: 1,
      catalogVersion: 14,
      totalPhotos: 0,
      dateRange: { first: '', last: '' },
      parsedAt: 1700000000000,
      catalogHash: 'a'.repeat(64),
    },
    yearInReview: null,
    yearToYear: null,
    overview: {
      totalPhotos: 0,
      dateRange: { first: '', last: '' },
      daysShot: 0,
      photosPerDay: 0,
      bodyCount: 0,
      lensCount: 0,
      topBody: null,
      topLens: null,
      topFocalLengthMm: null,
    },
    gear: { bodiesOverTime: [], topLenses: [], topCombos: [], retired: [] },
    focalLength: { histogram: [], topPeaks: [], bestOnePrime: null },
    focalLengthPerZoom: { zooms: [] },
    apertures: { perLens: [] },
    timeOfDay: {
      byClockHour: [],
      bySunAngle: { gpsPhotosCount: 0, goldenHour: 0, blueHour: 0, midday: 0, night: 0 },
      perGearByClockHour: [],
    },
    heatmap: { byDay: [], years: [] },
    gps: { totalPhotosWithGps: 0, pctWithGps: 0, clusters: [], topRegions: [] },
    curation: {
      funnel: { total: 0, notRejected: 0, rated1Plus: 0, rated4Plus: 0 },
      pickRateByBody: [],
      pickRateByLens: [],
    },
    editIntensity: {
      avgExposureShiftStops: 0,
      avgCropPct: 0,
      pctWithLocalAdjustments: 0,
      pctWithPresets: 0,
      topPresets: [],
      scoreByMonth: [],
      perGearScores: [],
      sampled: false,
      sampleSize: 0,
    },
    ratings: {
      distribution: { rejected: 0, r0: 0, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 },
      colorLabels: [],
      pickRateByBody: [],
      pickRateByLens: [],
    },
    keywords: {
      totalTaggedPhotos: 0, totalUntaggedPhotos: 0, uniqueKeywordCount: 0,
      avgKeywordsPerTaggedPhoto: 0, orphanKeywordCount: 0,
      topKeywords: [], blindSpots: [],
    },
    bursts: {
      totalBursts: 0, totalPhotosInBursts: 0, pctInBursts: 0, longestBurst: 0,
      lengthHistogram: [], keeperRatePct: 0, singleShotKeeperRatePct: 0,
    },
    catalogHealth: {
      missingOriginals: 0, missingPreviews: 0, brokenPaths: 0, likelyDuplicates: 0,
      duplicateClusters: [], missingByRootFolder: [],
    },
  }
}

describe('insightBlobSchema', () => {
  it('accepts a minimal valid blob', () => {
    const res = insightBlobSchema.safeParse(minimalBlob())
    expect(res.success).toBe(true)
  })

  it('rejects a blob with the wrong schemaVersion', () => {
    const bad = minimalBlob()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(bad.meta as any).schemaVersion = 2
    const res = insightBlobSchema.safeParse(bad)
    expect(res.success).toBe(false)
  })

  it('rejects a blob missing meta', () => {
    const bad = minimalBlob() as unknown as Record<string, unknown>
    delete bad.meta
    const res = insightBlobSchema.safeParse(bad)
    expect(res.success).toBe(false)
  })

  it('passthroughs unknown keys inside blocks (forward-compat)', () => {
    const ok = minimalBlob() as unknown as Record<string, unknown>
    ;(ok.overview as Record<string, unknown>).extraThing = 'future-block'
    const res = insightBlobSchema.safeParse(ok)
    expect(res.success).toBe(true)
  })

  it('rejects when meta.catalogHash is not a 64-char hex string', () => {
    const bad = minimalBlob()
    bad.meta.catalogHash = 'short'
    const res = insightBlobSchema.safeParse(bad)
    expect(res.success).toBe(false)
  })

  it('accepts a blob with filterContext present', () => {
    const ok = minimalBlob()
    ok.filterContext = { cameras: ['Sony A7R V'] }
    const res = insightBlobSchema.safeParse(ok)
    expect(res.success).toBe(true)
  })
})

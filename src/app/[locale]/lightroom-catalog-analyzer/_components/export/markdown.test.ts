import { describe, expect, it } from 'vitest'
import { markdownReport } from './markdown'
import type { InsightBlob } from '@/lib/lrcat/types'

function fixtureBlob(overrides: Partial<InsightBlob> = {}): InsightBlob {
  const base: InsightBlob = {
    meta: {
      schemaVersion: 1,
      catalogVersion: 14,
      totalPhotos: 3120,
      dateRange: { first: '2022-01-01', last: '2024-12-31' },
      parsedAt: 1_700_000_000_000,
      catalogHash: 'abc123def4567890',
    },
    yearInReview: {
      year: 2024, totalPhotos: 1240, daysShot: 87,
      topBody: 'Sony A7R V', topLens: '24-70mm f/2.8 GM',
      topFocalLengthMm: 35, topApertureFNumber: 2.97,
      mostProlificMonth: { month: '2024-08', count: 489 },
      avgShotsPerDay: 14.3,
      monthlyVolume: [{ month: '2024-01', count: 62 }],
      topGearShare: [{ gear: 'Sony A7R V', pct: 62 }],
      timeOfDayShare: [{ bucket: 'evening', pct: 41 }],
      topLensInMonth: '24-70mm f/2.8 GM',
    },
    yearToYear: {
      years: [2022, 2023, 2024],
      rows: [
        { statKey: 'totalPhotos', label: 'Total photos', values: [780, 1100, 1240], deltas: [null, 320, 140] },
        { statKey: 'topBody', label: 'Top body', values: ['Sony A7 III', 'Sony A7R V', 'Sony A7R V'], deltas: [null, 0, 0] },
      ],
      biggestShift: { statKey: 'totalPhotos', year: 2023, deltaText: '+320 photos' },
    },
    overview: {
      totalPhotos: 3120, dateRange: { first: '2022-01-01', last: '2024-12-31' },
      daysShot: 223, photosPerDay: 14, bodyCount: 2, lensCount: 5,
      topBody: 'Sony A7R V', topLens: '24-70mm f/2.8 GM', topFocalLengthMm: 35,
    },
    gear: {
      bodiesOverTime: [{ month: '2024-01', body: 'Sony A7R V', count: 80 }],
      topLenses: [{ lens: '24-70mm f/2.8 GM', count: 1800 }, { lens: '70-200mm f/2.8 GM', count: 720 }],
      topCombos: [{ body: 'Sony A7R V', lens: '24-70mm f/2.8 GM', count: 1800, firstUsed: '2022-01-01', lastUsed: '2024-12-31' }],
      retired: [{ kind: 'lens', name: 'Sony 28mm f/2', lastUsed: '2022-05-01' }],
    },
    focalLength: {
      histogram: [{ mm: 24, count: 200 }, { mm: 35, count: 480 }],
      topPeaks: [{ mm: 35, pctOfTotal: 22 }, { mm: 70, pctOfTotal: 14 }],
      bestOnePrime: { mm: 35, coveragePct: 47 },
    },
    focalLengthPerZoom: {
      zooms: [{ lens: '24-70mm f/2.8 GM', histogram: [{ mm: 24, count: 1100 }], topMm: 24, topMmPct: 62 }],
    },
    apertures: {
      perLens: [{ lens: '24-70mm f/2.8 GM', histogram: [{ aperture: 2.8, count: 1280 }], wideOpenPct: 71 }],
    },
    timeOfDay: {
      byClockHour: [{ hour: 18, count: 320 }],
      bySunAngle: { gpsPhotosCount: 980, goldenHour: 320, blueHour: 180, midday: 280, night: 200 },
      perGearByClockHour: [{ gear: 'Sony A7R V', histogram: [{ hour: 18, count: 200 }] }],
    },
    heatmap: { byDay: [{ date: '2024-08-15', count: 42, topLens: '24-70mm f/2.8 GM' }], years: [2022, 2023, 2024] },
    gps: {
      totalPhotosWithGps: 980, pctWithGps: 31,
      clusters: [{ lat: 40.7, lng: -74.0, count: 320 }],
      topRegions: [{ region: 'United States', count: 320 }, { region: 'France', count: 110 }],
    },
    curation: {
      funnel: { total: 3120, notRejected: 2980, rated1Plus: 2100, rated4Plus: 780 },
      pickRateByBody: [{ body: 'Sony A7R V', total: 2400, rated4Plus: 680, pickRatePct: 28 }],
      pickRateByLens: [{ lens: '24-70mm f/2.8 GM', total: 1800, rated4Plus: 510, pickRatePct: 28 }],
    },
    editIntensity: {
      avgExposureShiftStops: 0.42, avgCropPct: 8.1, pctWithLocalAdjustments: 36, pctWithPresets: 22,
      topPresets: [{ name: 'VSCO Kodak Gold', count: 240 }],
      scoreByMonth: [{ month: '2024-01', score: 41 }],
      perGearScores: [{ gear: 'Sony A7R V', score: 48 }],
      sampled: false, sampleSize: 3120,
    },
    ratings: {
      distribution: { rejected: 140, r0: 1980, r1: 320, r2: 180, r3: 220, r4: 180, r5: 100 },
      colorLabels: [{ label: 'Red', count: 120 }],
      pickRateByBody: [{ body: 'Sony A7R V', total: 2400, rated4Plus: 280, pickRatePct: 11 }],
      pickRateByLens: [{ lens: '24-70mm f/2.8 GM', total: 1800, rated4Plus: 200, pickRatePct: 11 }],
    },
    keywords: {
      totalTaggedPhotos: 2200, totalUntaggedPhotos: 920, uniqueKeywordCount: 184,
      avgKeywordsPerTaggedPhoto: 3.4, orphanKeywordCount: 18,
      topKeywords: [{ keyword: 'street', count: 480 }, { keyword: 'portrait', count: 320 }],
      blindSpots: [{ yearMonth: '2023-03', coveragePct: 8 }],
    },
    bursts: {
      totalBursts: 240, totalPhotosInBursts: 1020, pctInBursts: 33, longestBurst: 18,
      lengthHistogram: [{ length: 3, count: 120 }],
      keeperRatePct: 8, singleShotKeeperRatePct: 13,
    },
    catalogHealth: {
      missingOriginals: 14, missingPreviews: 3, brokenPaths: 2, likelyDuplicates: 22,
      duplicateClusters: [{ size: 2, firstPath: '2024/01/img_001.NEF', lastPath: '2024/01/img_001-2.NEF', captureTime: '2024-01-15T10:23:11' }],
      missingByRootFolder: [{ folder: '/Photos/2022', count: 14 }],
    },
  }
  return { ...base, ...overrides }
}

describe('markdownReport', () => {
  it('produces a stable unfiltered report', () => {
    expect(markdownReport(fixtureBlob())).toMatchSnapshot()
  })

  it('produces a stable filtered report with a filter-context header', () => {
    const blob = fixtureBlob({
      filterContext: {
        cameras: ['Sony A7R V'],
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
        ratings: [4, 5],
      },
    })
    const md = markdownReport(blob)
    expect(md).toContain('## Filter applied')
    expect(md).toContain('Cameras: Sony A7R V')
    expect(md).toContain('Date range: 2024-01-01 – 2024-12-31')
    expect(md).toContain('Ratings: 4, 5')
    expect(md).toMatchSnapshot()
  })

  it('starts with a top-level title and the brand attribution', () => {
    const md = markdownReport(fixtureBlob())
    expect(md.startsWith('# Lightroom Catalog Analysis')).toBe(true)
    expect(md).toContain('Generated by phototools.io/lightroom-catalog-analyzer')
  })

  it('emits one ## section per spine entry', () => {
    const md = markdownReport(fixtureBlob())
    for (const heading of [
      '## Year in Review', '## Year-to-Year', '## Overview', '## Gear',
      '## Focal Length', '## Focal Length per Zoom', '## Aperture Sweet Spot',
      '## Time of Day', '## Shooting Heatmap', '## GPS Locations',
      '## Curation Funnel', '## Edit Intensity', '## Ratings & Picks',
      '## Keyword Coverage', '## Burst Detection', '## Period Comparison',
      '## Catalog Health',
    ]) {
      expect(md).toContain(heading)
    }
  })

  it('renders the year-to-year grid as a Markdown table', () => {
    const md = markdownReport(fixtureBlob())
    expect(md).toContain('| Stat | 2022 | 2023 | 2024 |')
    expect(md).toContain('| --- | --- | --- | --- |')
    expect(md).toContain('| Total photos | 780 | 1,100 | 1,240 |')
  })
})

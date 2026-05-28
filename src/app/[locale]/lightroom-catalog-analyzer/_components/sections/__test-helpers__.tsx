import type { ReactNode } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { AnalyzerContext, type AnalyzerContextValue } from '../analyzer/AnalyzerContext'
import type { InsightBlob } from '@/lib/lrcat/types'

export function renderWithAnalyzer(
  ui: ReactNode,
  insightBlob: InsightBlob,
  overrides: Partial<AnalyzerContextValue> = {},
): { wrapper: ReactNode } {
  const value: AnalyzerContextValue = {
    status: 'loaded',
    insightBlob,
    worker: null,
    filter: undefined,
    error: null,
    loadedFromCache: false,
    lastProgress: null,
    open: async () => {},
    applyFilter: async () => {},
    setFilter: () => {},
    reset: () => {},
    setYearInReview: () => {},
    close: () => {},
    ...overrides,
  }
  return {
    wrapper: (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AnalyzerContext.Provider value={value}>{ui}</AnalyzerContext.Provider>
      </NextIntlClientProvider>
    ),
  }
}

/** Minimal but type-complete fixture every section test can extend. */
export function makeFixtureBlob(overrides: Partial<InsightBlob> = {}): InsightBlob {
  const base: InsightBlob = {
    meta: {
      schemaVersion: 1,
      catalogVersion: 14,
      totalPhotos: 3120,
      dateRange: { first: '2022-01-01', last: '2024-12-31' },
      parsedAt: Date.now(),
      catalogHash: 'abc123def456',
    },
    yearInReview: {
      year: 2024,
      totalPhotos: 1240,
      daysShot: 87,
      topBody: 'Sony A7R V',
      topLens: '24-70mm f/2.8 GM',
      topFocalLengthMm: 35,
      topApertureFNumber: 2.97,  // APEX value for f/2.8 (2 * log2(2.8))
      mostProlificMonth: { month: '2024-08', count: 489 },
      avgShotsPerDay: 14.3,
      monthlyVolume: Array.from({ length: 12 }, (_, i) => ({
        month: `2024-${String(i + 1).padStart(2, '0')}`,
        count: 50 + i * 12,
      })),
      topGearShare: [
        { gear: 'Sony A7R V', pct: 62 },
        { gear: 'Fuji X100V', pct: 38 },
      ],
      timeOfDayShare: [
        { bucket: 'morning', pct: 22 },
        { bucket: 'midday', pct: 18 },
        { bucket: 'evening', pct: 41 },
        { bucket: 'night', pct: 19 },
      ],
      topLensInMonth: '24-70mm f/2.8 GM',
    },
    yearToYear: {
      years: [2022, 2023, 2024],
      rows: [
        { statKey: 'totalPhotos', label: 'Total photos', values: [780, 1100, 1240], deltas: [null, 320, 140] },
        { statKey: 'daysShot', label: 'Days shot', values: [62, 74, 87], deltas: [null, 12, 13] },
        { statKey: 'topBody', label: 'Top body', values: ['Sony A7 III', 'Sony A7R V', 'Sony A7R V'], deltas: [null, 0, 0] },
      ],
      biggestShift: { statKey: 'totalPhotos', year: 2023, deltaText: '+320 photos' },
    },
    overview: {
      totalPhotos: 3120,
      dateRange: { first: '2022-01-01', last: '2024-12-31' },
      daysShot: 223,
      photosPerDay: 14,
      bodyCount: 2,
      lensCount: 5,
      topBody: 'Sony A7R V',
      topLens: '24-70mm f/2.8 GM',
      topFocalLengthMm: 35,
    },
    gear: {
      bodiesOverTime: [
        { month: '2024-01', body: 'Sony A7R V', count: 80 },
        { month: '2024-02', body: 'Sony A7R V', count: 95 },
      ],
      topLenses: [
        { lens: '24-70mm f/2.8 GM', count: 1800 },
        { lens: '70-200mm f/2.8 GM', count: 720 },
      ],
      topCombos: [
        { body: 'Sony A7R V', lens: '24-70mm f/2.8 GM', count: 1800, firstUsed: '2022-01-01', lastUsed: '2024-12-31' },
      ],
      retired: [{ kind: 'lens', name: 'Sony 28mm f/2', lastUsed: '2022-05-01' }],
    },
    focalLength: {
      histogram: Array.from({ length: 100 }, (_, i) => ({ mm: i + 14, count: Math.max(0, 50 - Math.abs(i - 21)) })),
      topPeaks: [{ mm: 35, pctOfTotal: 22 }, { mm: 70, pctOfTotal: 14 }],
      bestOnePrime: { mm: 35, coveragePct: 47 },
    },
    focalLengthPerZoom: {
      zooms: [
        {
          lens: '24-70mm f/2.8 GM',
          histogram: [{ mm: 24, count: 1100 }, { mm: 35, count: 400 }, { mm: 50, count: 200 }, { mm: 70, count: 100 }],
          topMm: 24,
          topMmPct: 62,
        },
      ],
    },
    apertures: {
      perLens: [
        {
          lens: '24-70mm f/2.8 GM',
          histogram: [{ aperture: 2.97, count: 1280 }, { aperture: 4, count: 320 }, { aperture: 4.97, count: 200 }],
          wideOpenPct: 71,
        },
      ],
    },
    timeOfDay: {
      byClockHour: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 50 + h * 4 })),
      bySunAngle: { gpsPhotosCount: 980, goldenHour: 320, blueHour: 180, midday: 280, night: 200 },
      perGearByClockHour: [
        { gear: 'Sony A7R V', histogram: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 30 + h * 2 })) },
      ],
    },
    heatmap: {
      byDay: Array.from({ length: 30 }, (_, i) => {
        const d = new Date(2024, 0, i + 1).toISOString().slice(0, 10)
        return { date: d, count: i * 3, topLens: i % 2 === 0 ? '24-70mm f/2.8 GM' : '70-200mm f/2.8 GM' }
      }),
      years: [2022, 2023, 2024],
    },
    gps: {
      totalPhotosWithGps: 980,
      pctWithGps: 31,
      clusters: [
        { lat: 40.7, lng: -74.0, count: 320 },
        { lat: 48.8, lng: 2.3, count: 110 },
      ],
      topRegions: [{ region: 'United States', count: 320 }, { region: 'France', count: 110 }],
    },
    curation: {
      funnel: { total: 3120, notRejected: 2980, rated1Plus: 2100, rated4Plus: 780 },
      pickRateByBody: [{ body: 'Sony A7R V', total: 2400, rated4Plus: 680, pickRatePct: 28 }],
      pickRateByLens: [{ lens: '24-70mm f/2.8 GM', total: 1800, rated4Plus: 510, pickRatePct: 28 }],
    },
    editIntensity: {
      avgExposureShiftStops: 0.42,
      avgCropPct: 8.1,
      pctWithLocalAdjustments: 36,
      pctWithPresets: 22,
      topPresets: [{ name: 'VSCO Kodak Gold', count: 240 }],
      scoreByMonth: [{ month: '2024-01', score: 41 }, { month: '2024-02', score: 47 }],
      perGearScores: [{ gear: 'Sony A7R V', score: 48 }],
      sampled: false,
      sampleSize: 3120,
    },
    ratings: {
      distribution: { rejected: 140, r0: 1980, r1: 320, r2: 180, r3: 220, r4: 180, r5: 100 },
      colorLabels: [{ label: 'Red', count: 120 }, { label: 'Green', count: 80 }],
      pickRateByBody: [{ body: 'Sony A7R V', total: 2400, rated4Plus: 280, pickRatePct: 11 }],
      pickRateByLens: [{ lens: '24-70mm f/2.8 GM', total: 1800, rated4Plus: 200, pickRatePct: 11 }],
    },
    keywords: {
      totalTaggedPhotos: 2200,
      totalUntaggedPhotos: 920,
      uniqueKeywordCount: 184,
      avgKeywordsPerTaggedPhoto: 3.4,
      orphanKeywordCount: 18,
      topKeywords: [{ keyword: 'street', count: 480 }, { keyword: 'portrait', count: 320 }],
      blindSpots: [{ yearMonth: '2023-03', coveragePct: 8 }],
    },
    bursts: {
      totalBursts: 240,
      totalPhotosInBursts: 1020,
      pctInBursts: 33,
      longestBurst: 18,
      lengthHistogram: [{ length: 3, count: 120 }, { length: 5, count: 60 }, { length: 10, count: 20 }],
      keeperRatePct: 8,
      singleShotKeeperRatePct: 13,
    },
    catalogHealth: {
      missingOriginals: 14,
      missingPreviews: 3,
      brokenPaths: 2,
      likelyDuplicates: 22,
      duplicateClusters: [
        { size: 2, firstPath: '2024/01/img_001.NEF', lastPath: '2024/01/img_001-2.NEF', captureTime: '2024-01-15T10:23:11' },
      ],
      missingByRootFolder: [{ folder: '/Photos/2022', count: 14 }],
    },
  }
  return { ...base, ...overrides }
}

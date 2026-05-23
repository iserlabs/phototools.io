import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { AnalyzerProvider } from './AnalyzerProvider'
import { useAnalyzer } from './useAnalyzer'
import type { InsightBlob } from '@/lib/lrcat/types'

const FAKE_BLOB: InsightBlob = {
  meta: {
    schemaVersion: 1, catalogVersion: 14, totalPhotos: 1,
    dateRange: { first: '2024-01-01', last: '2024-12-31' },
    parsedAt: Date.now(), catalogHash: 'abc',
  },
  yearInReview: null, yearToYear: null,
  overview: { totalPhotos: 1, dateRange: { first: '2024-01-01', last: '2024-12-31' }, daysShot: 1, photosPerDay: 1, bodyCount: 0, lensCount: 0, topBody: null, topLens: null, topFocalLengthMm: null },
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

// Mock the worker factory so the hook never tries to instantiate a real Worker in jsdom.
vi.mock('./workerFactory', () => ({
  createAnalyzerApi: vi.fn(() => ({
    api: {
      openCatalog: vi.fn(async (_buf, onProgress) => {
        await onProgress({ stage: 'reading', pct: 10 })
        await onProgress({ stage: 'aggregating', pct: 80 })
        return FAKE_BLOB
      }),
      applyFilter: vi.fn(async () => FAKE_BLOB),
      computeYearInReview: vi.fn(async () => FAKE_BLOB.yearInReview),
      close: vi.fn(async () => {}),
    },
    dispose: vi.fn(),
  })),
}))

// Stub the IDB cache module so tests don't need fake-indexeddb here.
vi.mock('./cache', () => ({
  getCachedInsights: vi.fn(async () => null),
  setCachedInsights: vi.fn(async () => {}),
  clearAllCachedInsights: vi.fn(async () => {}),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AnalyzerProvider>{children}</AnalyzerProvider>
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.resetModules()
})

describe('useAnalyzer (flattened contract)', () => {
  it('starts in idle status with a null insightBlob', () => {
    const { result } = renderHook(() => useAnalyzer(), { wrapper })
    expect(result.current.status).toBe('idle')
    expect(result.current.insightBlob).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.loadedFromCache).toBe(false)
  })

  it('transitions idle → parsing → loaded and exposes insightBlob + worker', async () => {
    const { result } = renderHook(() => useAnalyzer(), { wrapper })
    const buf = new ArrayBuffer(1024)
    await act(async () => {
      await result.current.open(buf, { name: 'demo.lrcat', size: 1024, lastModified: 1 })
    })
    await waitFor(() => expect(result.current.status).toBe('loaded'))
    expect(result.current.insightBlob).toEqual(FAKE_BLOB)
    expect(result.current.worker).not.toBeNull()
    expect(result.current.loadedFromCache).toBe(false)
  })

  it('records the latest progress event during parsing', async () => {
    const { result } = renderHook(() => useAnalyzer(), { wrapper })
    const buf = new ArrayBuffer(1024)
    await act(async () => {
      await result.current.open(buf, { name: 'demo.lrcat', size: 1024, lastModified: 1 })
    })
    expect(result.current.lastProgress?.stage).toBeDefined()
  })

  it('close() transitions back to idle and clears the blob', async () => {
    const { result } = renderHook(() => useAnalyzer(), { wrapper })
    const buf = new ArrayBuffer(1024)
    await act(async () => {
      await result.current.open(buf, { name: 'demo.lrcat', size: 1024, lastModified: 1 })
    })
    await act(async () => { result.current.close() })
    expect(result.current.status).toBe('idle')
    expect(result.current.insightBlob).toBeNull()
  })

  it('setYearInReview patches just the yearInReview block on the loaded blob', async () => {
    const { result } = renderHook(() => useAnalyzer(), { wrapper })
    const buf = new ArrayBuffer(1024)
    await act(async () => {
      await result.current.open(buf, { name: 'demo.lrcat', size: 1024, lastModified: 1 })
    })
    await waitFor(() => expect(result.current.status).toBe('loaded'))
    const yir = { ...FAKE_BLOB, yearInReview: { year: 2024 } as never }.yearInReview!
    await act(async () => { result.current.setYearInReview(yir) })
    expect(result.current.insightBlob?.yearInReview).toEqual(yir)
  })

  it('setFilter/reset update the filter accessor', async () => {
    const { result } = renderHook(() => useAnalyzer(), { wrapper })
    await act(async () => { result.current.setFilter({ ratings: [4, 5] }) })
    expect(result.current.filter).toEqual({ ratings: [4, 5] })
    await act(async () => { await result.current.reset() })
    expect(result.current.filter).toBeUndefined()
  })

  it('reset() re-aggregates UNFILTERED when loaded (not just clearing the accessor)', async () => {
    // Regression guard: reset must re-run the worker with an empty filter, else
    // the dashboard keeps showing stale filtered charts after Reset.
    const { result } = renderHook(() => useAnalyzer(), { wrapper })
    const buf = new ArrayBuffer(1024)
    await act(async () => {
      await result.current.open(buf, { name: 'demo.lrcat', size: 1024, lastModified: 1 })
    })
    await waitFor(() => expect(result.current.status).toBe('loaded'))
    await act(async () => { await result.current.applyFilter({ cameras: ['A'] }) })
    expect(result.current.filter).toEqual({ cameras: ['A'] })

    const { createAnalyzerApi } = await import('./workerFactory')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (vi.mocked(createAnalyzerApi).mock.results.at(-1)!.value as any).api
    api.applyFilter.mockClear()

    await act(async () => { await result.current.reset() })
    expect(result.current.filter).toBeUndefined()
    expect(result.current.insightBlob).not.toBeNull()
    expect(api.applyFilter).toHaveBeenCalledWith({})
  })

  it('records error status with a localized error key on failure', async () => {
    const { result } = renderHook(() => useAnalyzer(), { wrapper })
    // A null buffer makes computeCatalogHash throw before the worker is reached.
    await act(async () => {
      await result.current.open(null as unknown as ArrayBuffer, { name: 'x.lrcat', size: 1, lastModified: 1 })
    })
    expect(result.current.status).toBe('error')
    expect(result.current.error).toBeTruthy()
  })
})

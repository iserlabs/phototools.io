/// <reference lib="webworker" />
import * as Comlink from 'comlink'
import type {
  AnalysisFilter,
  InsightBlob,
  ProgressEvent,
  YearInReviewBlock,
} from '@/lib/lrcat/types'
import { openCatalog, type Database, UnsupportedCatalogError } from './open'
import { computeCatalogHash } from './hash'
import { populateCropFactorTable } from './crop-factor'
import { aggregateOverview } from './aggregators/overview'
import { aggregateGear } from './aggregators/gear'
import { aggregateFocalLength } from './aggregators/focal-length'
import { aggregateFocalLengthPerZoom } from './aggregators/focal-length-per-zoom'
import { aggregateApertureSweetSpot } from './aggregators/aperture-sweet-spot'
import { aggregateTimeOfDay } from './aggregators/time-of-day'
import { aggregateHeatmap } from './aggregators/heatmap'
import { aggregateGps } from './aggregators/gps'
import { aggregateCurationFunnel } from './aggregators/curation-funnel'
import { aggregateEditIntensity } from './aggregators/edit-intensity'
import { aggregateRatings } from './aggregators/ratings'
import { aggregateKeywords } from './aggregators/keywords'
import { aggregateBursts } from './aggregators/bursts'
import { aggregateCatalogHealth } from './aggregators/catalog-health'
import { aggregateYearInReview } from './aggregators/year-in-review'
import { aggregateYearToYear } from './aggregators/year-to-year'

/**
 * The shape every aggregator (and crop-factor populate) consumes. The
 * sqlite-wasm oo1 `Database` satisfies this at runtime, but its `.d.mts`
 * types the bind param as the narrower `BindingSpec` (which excludes a plain
 * `unknown[]`). We wrap the handle once so aggregators stay decoupled from
 * sqlite-wasm's exact binding types — the production analog of the
 * `adaptForAggregators` test helper.
 */
interface AggregatorDb {
  selectObject: (sql: string, params?: unknown[]) => unknown | undefined
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
  exec: (sql: string) => void
}

function adaptDatabase(db: Database): AggregatorDb {
  // sqlite-wasm throws "This statement has no bindable parameters" if you pass
  // a (non-undefined) bind to a parameterless query — so coerce empty arrays
  // to `undefined`. better-sqlite3 (tests) tolerates `[]`, hence the split.
  const bind = (params?: unknown[]) =>
    params && params.length > 0 ? (params as never) : undefined
  return {
    selectObject: (sql, params) => db.selectObject(sql, bind(params)),
    selectObjects: (sql, params) => db.selectObjects(sql, bind(params)),
    exec: (sql) => { db.exec(sql) },
  }
}

let dbHandle: Database | null = null
let adapted: AggregatorDb | null = null
let catalogVersion = 0
let catalogHash = ''
let parsedAt = 0

// Per-aggregator stages — used both for run ordering and as the `stage` value
// on aggregation-phase progress events. (Audit m-2: the lifecycle stages the UI
// localizes are `opening`/`hashing`/`aggregating`/`finalizing`; during the
// aggregating phase we emit the specific aggregator key as `stage` so Plan 1e
// can either show a localized "Analyzing…" umbrella or the per-step detail.)
const STAGES = [
  'overview', 'gear', 'focal-length', 'focal-length-per-zoom',
  'apertures', 'time-of-day', 'heatmap', 'gps',
  'curation', 'edit-intensity', 'ratings', 'keywords',
  'bursts', 'catalog-health', 'year-to-year', 'year-in-review',
] as const

function emitProgress(onProgress: ((e: ProgressEvent) => void) | undefined, stage: string, index: number) {
  if (!onProgress) return
  const pct = Math.round(((index + 1) / STAGES.length) * 100)
  onProgress({ stage, pct })
}

function requireDb(): AggregatorDb {
  if (!adapted) throw new Error('Catalog not open. Call openCatalog first.')
  return adapted
}

/**
 * Run every aggregator against the open DB with an optional global filter.
 * Filterable aggregators receive `filter`; year-scoped aggregators run with
 * their own scope and ignore the filter.
 */
function runAggregators(filter: AnalysisFilter | undefined, onProgress?: (e: ProgressEvent) => void): InsightBlob {
  const db = requireDb()

  const overview = aggregateOverview(db, filter)
  emitProgress(onProgress, 'overview', 0)
  const gear = aggregateGear(db, filter)
  emitProgress(onProgress, 'gear', 1)
  const focalLength = aggregateFocalLength(db, filter)
  emitProgress(onProgress, 'focal-length', 2)
  const focalLengthPerZoom = aggregateFocalLengthPerZoom(db, filter)
  emitProgress(onProgress, 'focal-length-per-zoom', 3)
  const apertures = aggregateApertureSweetSpot(db, filter)
  emitProgress(onProgress, 'apertures', 4)
  const timeOfDay = aggregateTimeOfDay(db, filter)
  emitProgress(onProgress, 'time-of-day', 5)
  const heatmap = aggregateHeatmap(db, filter)
  emitProgress(onProgress, 'heatmap', 6)
  const gps = aggregateGps(db, filter)
  emitProgress(onProgress, 'gps', 7)
  const curation = aggregateCurationFunnel(db, filter)
  emitProgress(onProgress, 'curation', 8)
  const editIntensity = aggregateEditIntensity(db, filter)
  emitProgress(onProgress, 'edit-intensity', 9)
  const ratings = aggregateRatings(db, filter)
  emitProgress(onProgress, 'ratings', 10)
  const keywords = aggregateKeywords(db, filter)
  emitProgress(onProgress, 'keywords', 11)
  const bursts = aggregateBursts(db, filter)
  emitProgress(onProgress, 'bursts', 12)
  const catalogHealth = aggregateCatalogHealth(db) // ignores filter
  emitProgress(onProgress, 'catalog-health', 13)
  const yearToYear = aggregateYearToYear(db, 3)    // ignores filter
  emitProgress(onProgress, 'year-to-year', 14)

  // Year-in-Review defaults to the most recent year with photos.
  const latestYear = (db.selectObject(
    `SELECT CAST(strftime('%Y', MAX(img.captureTime)) AS INTEGER) AS y
       FROM Adobe_images img WHERE img.captureTime IS NOT NULL`,
  ) as { y: number | null } | undefined)?.y ?? null
  const yearInReview = latestYear != null ? aggregateYearInReview(db, latestYear) : null
  emitProgress(onProgress, 'year-in-review', 15)

  return {
    meta: {
      schemaVersion: 1,
      catalogVersion,
      totalPhotos: overview.totalPhotos,
      dateRange: overview.dateRange,
      parsedAt,
      catalogHash,
    },
    yearInReview,
    yearToYear,
    overview,
    gear,
    focalLength,
    focalLengthPerZoom,
    apertures,
    timeOfDay,
    heatmap,
    gps,
    curation,
    editIntensity,
    ratings,
    keywords,
    bursts,
    catalogHealth,
    ...(filter ? { filterContext: filter } : {}),
  }
}

const api = {
  async openCatalog(
    buffer: ArrayBuffer,
    onProgress?: (e: ProgressEvent) => void,
    fileSize?: number,
    lastModified?: number,
  ): Promise<InsightBlob> {
    // Close any prior handle (e.g. user picked a second catalog without reload).
    if (dbHandle) {
      try { dbHandle.close() } catch { /* ignore */ }
      dbHandle = null
      adapted = null
    }

    onProgress?.({ stage: 'opening', pct: 0 })

    let opened: { db: Database; catalogVersion: number }
    try {
      opened = await openCatalog(buffer)
    } catch (e) {
      if (e instanceof UnsupportedCatalogError) throw e
      throw new Error('Failed to open catalog: ' + (e as Error).message)
    }

    dbHandle = opened.db
    adapted = adaptDatabase(opened.db)
    catalogVersion = opened.catalogVersion

    // Audit M-2: derive the 35mm-equivalent crop-factor table from sensors.ts
    // so the focal-length aggregator's LEFT JOIN resolves real crop factors.
    onProgress?.({ stage: 'schema', pct: 2 })
    populateCropFactorTable(adapted)

    onProgress?.({ stage: 'hashing', pct: 4 })
    catalogHash = await computeCatalogHash(buffer, fileSize ?? buffer.byteLength, lastModified ?? Date.now())
    parsedAt = Date.now()

    const blob = runAggregators(undefined, onProgress)
    onProgress?.({ stage: 'finalizing', pct: 100 })
    return blob
  },

  async applyFilter(filter: AnalysisFilter): Promise<InsightBlob> {
    return runAggregators(filter)
  },

  async computeYearInReview(year: number): Promise<YearInReviewBlock> {
    const db = requireDb()
    return aggregateYearInReview(db, year)
  },

  async close(): Promise<void> {
    if (dbHandle) {
      try { dbHandle.close() } catch { /* ignore */ }
      dbHandle = null
    }
    adapted = null
    catalogVersion = 0
    catalogHash = ''
    parsedAt = 0
  },
}

export type AnalyzerWorker = typeof api

Comlink.expose(api)

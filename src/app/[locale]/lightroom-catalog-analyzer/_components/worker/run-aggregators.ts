/**
 * Runs all aggregators against the open DB with an optional global filter.
 *
 * Extracted from analyzer.worker.ts to keep both files under the 200-line cap.
 */
import type { AnalysisFilter, InsightBlob, ProgressEvent } from '@/lib/lrcat/types'
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
import {
  EMPTY_OVERVIEW, EMPTY_GEAR, EMPTY_FOCAL_LENGTH, EMPTY_FOCAL_LENGTH_PER_ZOOM,
  EMPTY_APERTURE, EMPTY_TIME_OF_DAY, EMPTY_HEATMAP, EMPTY_GPS, EMPTY_CURATION,
  EMPTY_EDIT_INTENSITY, EMPTY_RATINGS, EMPTY_KEYWORDS, EMPTY_BURSTS,
  EMPTY_CATALOG_HEALTH, EMPTY_YEAR_IN_REVIEW, EMPTY_YEAR_TO_YEAR,
} from './aggregator-defaults'

export interface AggregatorDb {
  selectObject: (sql: string, params?: unknown[]) => unknown | undefined
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
  exec: (sql: string) => void
}

// Per-aggregator stages — used both for run ordering and as the `stage` value
// on aggregation-phase progress events.
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

interface RunMeta {
  catalogVersion: number
  catalogHash: string
  parsedAt: number
}

/**
 * Resilient per-aggregator wrapper. On success, emits progress and returns the
 * result. On failure, logs the error and returns the provided fallback default
 * so the remaining aggregators can still run.
 */
function at<T>(
  stage: string,
  index: number,
  fn: () => T,
  fallback: T,
  onProgress: ((e: ProgressEvent) => void) | undefined,
): T {
  try {
    const out = fn()
    emitProgress(onProgress, stage, index)
    return out
  } catch (e) {
    const err = e as Error
    console.error(`[lrcat] aggregator "${stage}" failed: ${err?.name}: ${err?.message}`)
    if (err?.stack) console.error(err.stack)
    emitProgress(onProgress, stage, index)
    return fallback
  }
}

/**
 * Run every aggregator against the open DB with an optional global filter.
 * Filterable aggregators receive `filter`; year-scoped aggregators run with
 * their own scope and ignore the filter.
 *
 * Individual aggregator failures are caught and replaced with typed empty
 * defaults so the dashboard renders all successful sections.
 */
export function runAggregators(
  db: AggregatorDb,
  meta: RunMeta,
  filter: AnalysisFilter | undefined,
  onProgress?: (e: ProgressEvent) => void,
): InsightBlob {
  const overview       = at('overview', 0, () => aggregateOverview(db, filter), EMPTY_OVERVIEW, onProgress)
  const gear           = at('gear', 1, () => aggregateGear(db, filter), EMPTY_GEAR, onProgress)
  const focalLength    = at('focal-length', 2, () => aggregateFocalLength(db, filter), EMPTY_FOCAL_LENGTH, onProgress)
  const focalLengthPerZoom = at('focal-length-per-zoom', 3, () => aggregateFocalLengthPerZoom(db, filter), EMPTY_FOCAL_LENGTH_PER_ZOOM, onProgress)
  const apertures      = at('apertures', 4, () => aggregateApertureSweetSpot(db, filter), EMPTY_APERTURE, onProgress)
  const timeOfDay      = at('time-of-day', 5, () => aggregateTimeOfDay(db, filter), EMPTY_TIME_OF_DAY, onProgress)
  const heatmap        = at('heatmap', 6, () => aggregateHeatmap(db, filter), EMPTY_HEATMAP, onProgress)
  const gps            = at('gps', 7, () => aggregateGps(db, filter), EMPTY_GPS, onProgress)
  const curation       = at('curation', 8, () => aggregateCurationFunnel(db, filter), EMPTY_CURATION, onProgress)
  const editIntensity  = at('edit-intensity', 9, () => aggregateEditIntensity(db, filter), EMPTY_EDIT_INTENSITY, onProgress)
  const ratings        = at('ratings', 10, () => aggregateRatings(db, filter), EMPTY_RATINGS, onProgress)
  const keywords       = at('keywords', 11, () => aggregateKeywords(db, filter), EMPTY_KEYWORDS, onProgress)
  const bursts         = at('bursts', 12, () => aggregateBursts(db, filter), EMPTY_BURSTS, onProgress)
  const catalogHealth  = at('catalog-health', 13, () => aggregateCatalogHealth(db), EMPTY_CATALOG_HEALTH, onProgress)
  const yearToYear     = at('year-to-year', 14, () => aggregateYearToYear(db, 3), EMPTY_YEAR_TO_YEAR, onProgress)
  const yearInReview   = at('year-in-review', 15, () => {
    const latestYear = (db.selectObject(
      `SELECT CAST(strftime('%Y', MAX(img.captureTime)) AS INTEGER) AS y
         FROM Adobe_images img WHERE img.captureTime IS NOT NULL`,
    ) as { y: number | null } | undefined)?.y ?? null
    return latestYear != null ? aggregateYearInReview(db, latestYear) : null
  }, EMPTY_YEAR_IN_REVIEW, onProgress)

  return {
    meta: {
      schemaVersion: 1,
      catalogVersion: meta.catalogVersion,
      totalPhotos: overview.totalPhotos,
      dateRange: overview.dateRange,
      parsedAt: meta.parsedAt,
      catalogHash: meta.catalogHash,
    },
    yearInReview, yearToYear, overview, gear, focalLength, focalLengthPerZoom,
    apertures, timeOfDay, heatmap, gps, curation, editIntensity, ratings,
    keywords, bursts, catalogHealth,
    ...(filter ? { filterContext: filter } : {}),
  }
}

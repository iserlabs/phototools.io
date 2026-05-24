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
 * Run every aggregator against the open DB with an optional global filter.
 * Filterable aggregators receive `filter`; year-scoped aggregators run with
 * their own scope and ignore the filter.
 */
export function runAggregators(
  db: AggregatorDb,
  meta: RunMeta,
  filter: AnalysisFilter | undefined,
  onProgress?: (e: ProgressEvent) => void,
): InsightBlob {
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
      catalogVersion: meta.catalogVersion,
      totalPhotos: overview.totalPhotos,
      dateRange: overview.dateRange,
      parsedAt: meta.parsedAt,
      catalogHash: meta.catalogHash,
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

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
  // Run each aggregator via `at()` so a failure is pinned to a specific stage.
  // A query that throws on real-catalog data otherwise surfaces only as a
  // generic "analysis failed"; here the stage + error name/message are logged
  // before rethrowing, which is essential for diagnosing data-specific failures.
  let failedStage = ''
  const at = <T,>(stage: string, index: number, fn: () => T): T => {
    failedStage = stage
    const out = fn()
    emitProgress(onProgress, stage, index)
    return out
  }
  try {
    const overview = at('overview', 0, () => aggregateOverview(db, filter))
    const gear = at('gear', 1, () => aggregateGear(db, filter))
    const focalLength = at('focal-length', 2, () => aggregateFocalLength(db, filter))
    const focalLengthPerZoom = at('focal-length-per-zoom', 3, () => aggregateFocalLengthPerZoom(db, filter))
    const apertures = at('apertures', 4, () => aggregateApertureSweetSpot(db, filter))
    const timeOfDay = at('time-of-day', 5, () => aggregateTimeOfDay(db, filter))
    const heatmap = at('heatmap', 6, () => aggregateHeatmap(db, filter))
    const gps = at('gps', 7, () => aggregateGps(db, filter))
    const curation = at('curation', 8, () => aggregateCurationFunnel(db, filter))
    const editIntensity = at('edit-intensity', 9, () => aggregateEditIntensity(db, filter))
    const ratings = at('ratings', 10, () => aggregateRatings(db, filter))
    const keywords = at('keywords', 11, () => aggregateKeywords(db, filter))
    const bursts = at('bursts', 12, () => aggregateBursts(db, filter))
    const catalogHealth = at('catalog-health', 13, () => aggregateCatalogHealth(db)) // ignores filter
    const yearToYear = at('year-to-year', 14, () => aggregateYearToYear(db, 3))      // ignores filter
    // Year-in-Review defaults to the most recent year with photos.
    const yearInReview = at('year-in-review', 15, () => {
      const latestYear = (db.selectObject(
        `SELECT CAST(strftime('%Y', MAX(img.captureTime)) AS INTEGER) AS y
           FROM Adobe_images img WHERE img.captureTime IS NOT NULL`,
      ) as { y: number | null } | undefined)?.y ?? null
      return latestYear != null ? aggregateYearInReview(db, latestYear) : null
    })

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
  } catch (e) {
    const err = e as Error
    console.error(`[lrcat] analysis failed at stage "${failedStage}": ${err?.name}: ${err?.message}`)
    if (err?.stack) console.error(err.stack)
    throw e
  }
}

import type { FocalLengthBlock, AnalysisFilter } from '@/lib/lrcat/types'
import { buildFilterPredicate } from '../filter'

interface DbLike {
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
}

const MIN_MM = 8
const MAX_MM = 800
const TOP_PEAKS = 5
const PRIME_CANDIDATES = [24, 28, 35, 50, 85, 105, 135, 200] as const
const PRIME_TOLERANCE = 0.25 // ± 25%
const MIN_PRIME_COVERAGE_PCT = 30 // only recommend a prime if coverage ≥ this

/**
 * Catalog-wide focal-length aggregator. Builds a 1mm-bin histogram of
 * 35mm-equivalent focal lengths, identifies top peaks, and computes the
 * "if you bought one prime" recommendation.
 *
 * Crop factor is read off each row (joined upstream at parse time from
 * `src/lib/data/sensors.ts` via the AgSensorCropFactor virtual table). When
 * missing or null, treated as 1.0.
 */
export function aggregateFocalLength(db: DbLike, filter?: AnalysisFilter): FocalLengthBlock {
  const pred = buildFilterPredicate(filter)
  const where = pred.sql || ''

  const rows = db.selectObjects(
    `SELECT exif.focalLength AS fl, COALESCE(sensor.cropFactor, 1.0) AS cf
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
       LEFT JOIN AgSensorCropFactor sensor ON sensor.cameraModelRef = exif.cameraModelRef
      WHERE exif.focalLength IS NOT NULL AND exif.focalLength > 0 ${where}`,
    pred.params,
  ) as Array<{ fl: number; cf: number }>

  // Bin into 1mm buckets of 35mm-equivalent focal length, dropping out-of-range.
  const bins = new Map<number, number>()
  let total = 0
  for (const row of rows) {
    const equiv = Math.round(row.fl * (row.cf || 1))
    if (equiv < MIN_MM || equiv > MAX_MM) continue
    bins.set(equiv, (bins.get(equiv) ?? 0) + 1)
    total++
  }

  if (total === 0) {
    return { histogram: [], topPeaks: [], bestOnePrime: null }
  }

  const histogram = [...bins.entries()]
    .map(([mm, count]) => ({ mm, count }))
    .sort((a, b) => a.mm - b.mm)

  const topPeaks = [...histogram]
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_PEAKS)
    .map((b) => ({ mm: b.mm, pctOfTotal: Number(((b.count / total) * 100).toFixed(2)) }))

  // "Best one prime": pick F from PRIME_CANDIDATES that maximizes the fraction
  // of shots within F ± PRIME_TOLERANCE * F. Only return when coverage ≥ threshold.
  //
  // Ties on coverage count happen when a focal length sits exactly on the edge
  // of two candidates' windows (e.g. 35mm is at 28 × 1.25). Break ties by
  // preferring the candidate nearest the covered shots' weighted-mean focal
  // length, so a prime centered on the dominant peak wins over one that only
  // catches it at the boundary.
  let bestPrime: number | null = null
  let bestCoverageCount = 0
  let bestPeakDistance = Infinity
  for (const f of PRIME_CANDIDATES) {
    const low = f * (1 - PRIME_TOLERANCE)
    const high = f * (1 + PRIME_TOLERANCE)
    let covered = 0
    let weightedMm = 0
    for (const [mm, count] of bins) {
      if (mm >= low && mm <= high) {
        covered += count
        weightedMm += mm * count
      }
    }
    if (covered === 0) continue
    const peakDistance = Math.abs(f - weightedMm / covered)
    if (
      covered > bestCoverageCount ||
      (covered === bestCoverageCount && peakDistance < bestPeakDistance)
    ) {
      bestCoverageCount = covered
      bestPeakDistance = peakDistance
      bestPrime = f
    }
  }
  const coveragePct = (bestCoverageCount / total) * 100
  const bestOnePrime =
    bestPrime !== null && coveragePct >= MIN_PRIME_COVERAGE_PCT
      ? { mm: bestPrime, coveragePct: Number(coveragePct.toFixed(2)) }
      : null

  return { histogram, topPeaks, bestOnePrime }
}

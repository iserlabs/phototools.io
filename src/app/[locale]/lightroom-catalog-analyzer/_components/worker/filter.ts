import type { AnalysisFilter } from '@/lib/lrcat/types'

export interface CompiledPredicate {
  /** WHERE-clause fragment beginning with " AND ..." when non-empty, or "" when no filter. */
  sql: string
  params: Array<string | number>
}

/**
 * Compile an AnalysisFilter into a parameterized SQL fragment that callers
 * inject into their queries. The fragment assumes the following table aliases
 * in the calling query:
 *   - img   → Adobe_images
 *   - exif  → AgHarvestedExifMetadata
 *   - cam   → AgInternedExifCameraModel (joined via exif.cameraModelRef)
 *   - lens  → AgInternedExifLens (joined via exif.lensRef)
 *
 * Callers are responsible for adding those JOINs.
 */
export function buildFilterPredicate(filter: AnalysisFilter | undefined): CompiledPredicate {
  if (!filter) return { sql: '', params: [] }

  const parts: string[] = []
  const params: Array<string | number> = []

  if (filter.dateRange) {
    parts.push('img.captureTime >= ?')
    parts.push('img.captureTime <= ?')
    params.push(filter.dateRange.start, filter.dateRange.end)
  }

  if (filter.cameras && filter.cameras.length > 0) {
    parts.push(`cam.value IN (${filter.cameras.map(() => '?').join(', ')})`)
    params.push(...filter.cameras)
  }

  if (filter.lenses && filter.lenses.length > 0) {
    parts.push(`lens.value IN (${filter.lenses.map(() => '?').join(', ')})`)
    params.push(...filter.lenses)
  }

  if (filter.focalLengthRange) {
    parts.push('exif.focalLength BETWEEN ? AND ?')
    params.push(filter.focalLengthRange[0], filter.focalLengthRange[1])
  }

  if (filter.apertureRange) {
    parts.push('exif.aperture BETWEEN ? AND ?')
    params.push(filter.apertureRange[0], filter.apertureRange[1])
  }

  if (filter.isoRange) {
    parts.push('exif.isoSpeedRating BETWEEN ? AND ?')
    params.push(filter.isoRange[0], filter.isoRange[1])
  }

  if (filter.ratings && filter.ratings.length > 0) {
    parts.push(`img.rating IN (${filter.ratings.map(() => '?').join(', ')})`)
    params.push(...filter.ratings)
  }

  if (filter.picks === 'pick') {
    parts.push('img.pick = ?')
    params.push(1)
  } else if (filter.picks === 'reject') {
    parts.push('img.pick = ?')
    params.push(-1)
  } else if (filter.picks === 'none') {
    parts.push('img.pick = ?')
    params.push(0)
  }

  if (parts.length === 0) return { sql: '', params: [] }
  return { sql: ' AND ' + parts.join(' AND '), params }
}

// Note: `keywords` filter is not in the SQL predicate — it requires a join to
// the keyword tables, handled per-aggregator. The filter param is reserved for v2.

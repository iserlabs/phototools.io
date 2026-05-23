import type { FocalLengthPerZoomBlock, AnalysisFilter } from '@/lib/lrcat/types'
import { buildFilterPredicate } from '../filter'

interface DbLike {
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
}

const MIN_DISTINCT_FOCAL_LENGTHS = 3 // a lens is a "zoom" if it has at least this many distinct focal lengths
const TOP_ZOOMS_LIMIT = 6

/**
 * Per-zoom focal-length aggregator. Detects zoom lenses as any lens with at
 * least MIN_DISTINCT_FOCAL_LENGTHS distinct focal-length values in the
 * (filtered) view. For each detected zoom (ranked by shot count, top 6),
 * builds a 1mm histogram of physical focal lengths and reports the most-used
 * focal length plus its share.
 *
 * Note: physical mm, not 35mm-equivalent — the photographer's zoom-ring
 * position is what's interesting here, not the equivalent angle of view.
 */
export function aggregateFocalLengthPerZoom(db: DbLike, filter?: AnalysisFilter): FocalLengthPerZoomBlock {
  const pred = buildFilterPredicate(filter)
  const where = pred.sql || ''

  // First pass: count shots per lens and count distinct focal lengths per lens.
  const lensStats = db.selectObjects(
    `SELECT lens.value AS lens,
            COUNT(*) AS total,
            COUNT(DISTINCT ROUND(exif.focalLength)) AS distinctMm
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
      WHERE lens.value IS NOT NULL AND exif.focalLength IS NOT NULL AND exif.focalLength > 0 ${where}
      GROUP BY lens.value
      HAVING distinctMm >= ${MIN_DISTINCT_FOCAL_LENGTHS}
      ORDER BY total DESC
      LIMIT ${TOP_ZOOMS_LIMIT}`,
    pred.params,
  ) as Array<{ lens: string; total: number; distinctMm: number }>

  if (lensStats.length === 0) return { zooms: [] }

  // Second pass: per-zoom histogram.
  const zooms = lensStats.map((entry) => {
    const histRows = db.selectObjects(
      `SELECT ROUND(exif.focalLength) AS mm, COUNT(*) AS n
         FROM Adobe_images img
         JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
         JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
         LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
        WHERE lens.value = ? AND exif.focalLength IS NOT NULL AND exif.focalLength > 0 ${where}
        GROUP BY ROUND(exif.focalLength)
        ORDER BY mm ASC`,
      [entry.lens, ...pred.params],
    ) as Array<{ mm: number; n: number }>

    const histogram = histRows.map((r) => ({ mm: r.mm, count: r.n }))
    const totalShots = histogram.reduce((acc, b) => acc + b.count, 0)
    const top = [...histogram].sort((a, b) => b.count - a.count)[0]

    return {
      lens: entry.lens,
      histogram,
      topMm: top?.mm ?? 0,
      topMmPct: totalShots > 0 ? Number((((top?.count ?? 0) / totalShots) * 100).toFixed(2)) : 0,
    }
  })

  return { zooms }
}

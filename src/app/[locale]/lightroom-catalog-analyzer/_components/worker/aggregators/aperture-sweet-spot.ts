import type { ApertureBlock, AnalysisFilter } from '@/lib/lrcat/types'
import { buildFilterPredicate } from '../filter'

interface DbLike {
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
}

const MIN_SHOTS_PER_LENS = 100

/**
 * Aperture sweet-spot aggregator: per-lens aperture histograms, but only
 * for lenses with ≥MIN_SHOTS_PER_LENS shots in the (filtered) view. For each
 * lens, wideOpenPct = the fraction of shots at the smallest f-number observed
 * for that lens.
 */
export function aggregateApertureSweetSpot(db: DbLike, filter?: AnalysisFilter): ApertureBlock {
  const pred = buildFilterPredicate(filter)
  const where = pred.sql || ''

  // First pass: lenses qualifying by shot count.
  const lensRows = db.selectObjects(
    `SELECT lens.value AS lens, COUNT(*) AS total
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
      WHERE lens.value IS NOT NULL AND exif.aperture IS NOT NULL ${where}
      GROUP BY lens.value
      HAVING total >= ${MIN_SHOTS_PER_LENS}
      ORDER BY total DESC`,
    pred.params,
  ) as Array<{ lens: string; total: number }>

  const perLens = lensRows.map((entry) => {
    const histRows = db.selectObjects(
      `SELECT exif.aperture AS aperture, COUNT(*) AS n
         FROM Adobe_images img
         JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
         JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
         LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
        WHERE lens.value = ? AND exif.aperture IS NOT NULL ${where}
        GROUP BY exif.aperture
        ORDER BY exif.aperture ASC`,
      [entry.lens, ...pred.params],
    ) as Array<{ aperture: number; n: number }>

    const histogram = histRows.map((r) => ({ aperture: r.aperture, count: r.n }))
    const total = histogram.reduce((acc, b) => acc + b.count, 0)
    const wideOpen = histogram[0] // smallest f-number = wide open
    const wideOpenPct = total > 0 && wideOpen
      ? Number(((wideOpen.count / total) * 100).toFixed(2))
      : 0

    return { lens: entry.lens, histogram, wideOpenPct }
  })

  return { perLens }
}

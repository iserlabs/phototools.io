import type { OverviewBlock, AnalysisFilter } from '@/lib/lrcat/types'
import { buildFilterPredicate } from '../filter'

interface DbLike {
  selectObject: (sql: string, params?: unknown[]) => unknown | undefined
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
}

export function aggregateOverview(db: DbLike, filter?: AnalysisFilter): OverviewBlock {
  const pred = buildFilterPredicate(filter)
  const where = pred.sql || ''

  const totals = db.selectObject(
    `SELECT COUNT(*) AS total, MIN(img.captureTime) AS first, MAX(img.captureTime) AS last
       FROM Adobe_images img
       LEFT JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE 1=1 ${where}`,
    pred.params,
  ) as { total: number; first: string | null; last: string | null }

  if (totals.total === 0) {
    return {
      totalPhotos: 0,
      dateRange: { first: '', last: '' },
      daysShot: 0,
      photosPerDay: 0,
      bodyCount: 0,
      lensCount: 0,
      topBody: null,
      topLens: null,
      topFocalLengthMm: null,
    }
  }

  const daysShot = (db.selectObject(
    `SELECT COUNT(DISTINCT substr(img.captureTime, 1, 10)) AS d
       FROM Adobe_images img
       LEFT JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE 1=1 ${where}`,
    pred.params,
  ) as { d: number }).d

  const bodies = db.selectObjects(
    `SELECT cam.value AS name, COUNT(*) AS n
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE cam.value IS NOT NULL ${where}
      GROUP BY cam.value
      ORDER BY n DESC`,
    pred.params,
  ) as Array<{ name: string; n: number }>

  const lenses = db.selectObjects(
    `SELECT lens.value AS name, COUNT(*) AS n
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
      WHERE lens.value IS NOT NULL ${where}
      GROUP BY lens.value
      ORDER BY n DESC`,
    pred.params,
  ) as Array<{ name: string; n: number }>

  const topFocal = db.selectObject(
    `SELECT exif.focalLength AS fl, COUNT(*) AS n
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE exif.focalLength IS NOT NULL ${where}
      GROUP BY ROUND(exif.focalLength)
      ORDER BY n DESC
      LIMIT 1`,
    pred.params,
  ) as { fl: number; n: number } | undefined

  const first = totals.first ?? ''
  const last = totals.last ?? ''

  return {
    totalPhotos: totals.total,
    dateRange: { first, last },
    daysShot,
    photosPerDay: daysShot > 0 ? Number((totals.total / daysShot).toFixed(1)) : 0,
    bodyCount: bodies.length,
    lensCount: lenses.length,
    topBody: bodies[0]?.name ?? null,
    topLens: lenses[0]?.name ?? null,
    topFocalLengthMm: topFocal ? Math.round(topFocal.fl) : null,
  }
}

import type { CurationBlock, AnalysisFilter } from '@/lib/lrcat/types'
import { buildFilterPredicate } from '../filter'

interface DbLike {
  selectObject: (sql: string, params?: unknown[]) => unknown | undefined
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 1000) / 10
}

export function aggregateCurationFunnel(db: DbLike, filter?: AnalysisFilter): CurationBlock {
  const pred = buildFilterPredicate(filter)
  const where = pred.sql || ''

  // Single pass for the funnel counts via conditional SUMs.
  const funnel = db.selectObject(
    `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN img.pick != -1 THEN 1 ELSE 0 END) AS notRejected,
        SUM(CASE WHEN img.rating >= 1 THEN 1 ELSE 0 END) AS rated1Plus,
        SUM(CASE WHEN img.rating >= 4 THEN 1 ELSE 0 END) AS rated4Plus
       FROM Adobe_images img
       LEFT JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE 1=1 ${where}`,
    pred.params,
  ) as { total: number; notRejected: number; rated1Plus: number; rated4Plus: number } | undefined

  const byBody = db.selectObjects(
    `SELECT cam.value AS body,
            COUNT(*) AS total,
            SUM(CASE WHEN img.rating >= 4 THEN 1 ELSE 0 END) AS rated4Plus
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE cam.value IS NOT NULL ${where}
      GROUP BY cam.value
      ORDER BY total DESC`,
    pred.params,
  ) as Array<{ body: string; total: number; rated4Plus: number }>

  const byLens = db.selectObjects(
    `SELECT lens.value AS lens,
            COUNT(*) AS total,
            SUM(CASE WHEN img.rating >= 4 THEN 1 ELSE 0 END) AS rated4Plus
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
      WHERE lens.value IS NOT NULL ${where}
      GROUP BY lens.value
      ORDER BY total DESC`,
    pred.params,
  ) as Array<{ lens: string; total: number; rated4Plus: number }>

  return {
    funnel: {
      total: funnel?.total ?? 0,
      notRejected: funnel?.notRejected ?? 0,
      rated1Plus: funnel?.rated1Plus ?? 0,
      rated4Plus: funnel?.rated4Plus ?? 0,
    },
    pickRateByBody: byBody.map((r) => ({
      body: r.body,
      total: r.total,
      rated4Plus: r.rated4Plus,
      pickRatePct: pct(r.rated4Plus, r.total),
    })),
    pickRateByLens: byLens.map((r) => ({
      lens: r.lens,
      total: r.total,
      rated4Plus: r.rated4Plus,
      pickRatePct: pct(r.rated4Plus, r.total),
    })),
  }
}

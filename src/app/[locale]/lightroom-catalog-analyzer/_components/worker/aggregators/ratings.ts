import type { RatingsBlock, AnalysisFilter } from '@/lib/lrcat/types'
import { buildFilterPredicate } from '../filter'

interface DbLike {
  selectObject: (sql: string, params?: unknown[]) => unknown | undefined
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
}

function pct(n: number, d: number): number {
  if (d <= 0) return 0
  return Math.round((n / d) * 1000) / 10
}

export function aggregateRatings(db: DbLike, filter?: AnalysisFilter): RatingsBlock {
  const pred = buildFilterPredicate(filter)
  const where = pred.sql || ''

  const dist = db.selectObject(
    `SELECT
        SUM(CASE WHEN img.pick = -1 THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN img.pick != -1 AND (img.rating IS NULL OR img.rating = 0) THEN 1 ELSE 0 END) AS r0,
        SUM(CASE WHEN img.pick != -1 AND img.rating = 1 THEN 1 ELSE 0 END) AS r1,
        SUM(CASE WHEN img.pick != -1 AND img.rating = 2 THEN 1 ELSE 0 END) AS r2,
        SUM(CASE WHEN img.pick != -1 AND img.rating = 3 THEN 1 ELSE 0 END) AS r3,
        SUM(CASE WHEN img.pick != -1 AND img.rating = 4 THEN 1 ELSE 0 END) AS r4,
        SUM(CASE WHEN img.pick != -1 AND img.rating = 5 THEN 1 ELSE 0 END) AS r5
       FROM Adobe_images img
       LEFT JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE 1=1 ${where}`,
    pred.params,
  ) as { rejected: number; r0: number; r1: number; r2: number; r3: number; r4: number; r5: number } | undefined

  const colorLabels = db.selectObjects(
    `SELECT img.colorLabels AS label, COUNT(*) AS n
       FROM Adobe_images img
       LEFT JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE img.colorLabels IS NOT NULL AND img.colorLabels != '' ${where}
      GROUP BY img.colorLabels
      ORDER BY n DESC`,
    pred.params,
  ) as Array<{ label: string; n: number }>

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
    distribution: {
      rejected: dist?.rejected ?? 0,
      r0: dist?.r0 ?? 0,
      r1: dist?.r1 ?? 0,
      r2: dist?.r2 ?? 0,
      r3: dist?.r3 ?? 0,
      r4: dist?.r4 ?? 0,
      r5: dist?.r5 ?? 0,
    },
    colorLabels: colorLabels.map((r) => ({ label: r.label, count: r.n })),
    pickRateByBody: byBody.map((r) => ({
      body: r.body, total: r.total, rated4Plus: r.rated4Plus, pickRatePct: pct(r.rated4Plus, r.total),
    })),
    pickRateByLens: byLens.map((r) => ({
      lens: r.lens, total: r.total, rated4Plus: r.rated4Plus, pickRatePct: pct(r.rated4Plus, r.total),
    })),
  }
}

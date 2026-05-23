import type { GearBlock, AnalysisFilter } from '@/lib/lrcat/types'
import { buildFilterPredicate } from '../filter'

interface DbLike {
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
  selectObject: (sql: string, params?: unknown[]) => unknown | undefined
}

const TOP_LENSES_LIMIT = 10
const TOP_COMBOS_LIMIT = 10
const RETIRED_THRESHOLD_DAYS = 365

export function aggregateGear(db: DbLike, filter?: AnalysisFilter): GearBlock {
  const pred = buildFilterPredicate(filter)
  const where = pred.sql || ''

  const bodiesOverTime = db.selectObjects(
    `SELECT substr(img.captureTime, 1, 7) AS month, cam.value AS body, COUNT(*) AS n
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE cam.value IS NOT NULL AND img.captureTime IS NOT NULL ${where}
      GROUP BY month, body
      ORDER BY month ASC, n DESC`,
    pred.params,
  ) as Array<{ month: string; body: string; n: number }>

  const topLenses = db.selectObjects(
    `SELECT lens.value AS lens, COUNT(*) AS n
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
      WHERE lens.value IS NOT NULL ${where}
      GROUP BY lens.value
      ORDER BY n DESC
      LIMIT ${TOP_LENSES_LIMIT}`,
    pred.params,
  ) as Array<{ lens: string; n: number }>

  const topCombos = db.selectObjects(
    `SELECT cam.value AS body, lens.value AS lens, COUNT(*) AS n,
            MIN(img.captureTime) AS firstUsed, MAX(img.captureTime) AS lastUsed
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE cam.value IS NOT NULL AND lens.value IS NOT NULL ${where}
      GROUP BY cam.value, lens.value
      ORDER BY n DESC
      LIMIT ${TOP_COMBOS_LIMIT}`,
    pred.params,
  ) as Array<{ body: string; lens: string; n: number; firstUsed: string; lastUsed: string }>

  // Retired = gear whose lastUsed is older than RETIRED_THRESHOLD_DAYS before the catalog's max captureTime.
  const catEnd = (db.selectObject(
    `SELECT MAX(img.captureTime) AS last
       FROM Adobe_images img
       LEFT JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE 1=1 ${where}`,
    pred.params,
  ) as { last: string | null }).last
  const cutoff = catEnd
    ? new Date(new Date(catEnd).getTime() - RETIRED_THRESHOLD_DAYS * 86400000).toISOString()
    : null

  const retiredBodies = catEnd ? db.selectObjects(
    `SELECT cam.value AS name, MAX(img.captureTime) AS lastUsed
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE cam.value IS NOT NULL ${where}
      GROUP BY cam.value
      HAVING lastUsed < ?`,
    [...pred.params, cutoff],
  ) as Array<{ name: string; lastUsed: string }> : []

  const retiredLenses = catEnd ? db.selectObjects(
    `SELECT lens.value AS name, MAX(img.captureTime) AS lastUsed
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
      WHERE lens.value IS NOT NULL ${where}
      GROUP BY lens.value
      HAVING lastUsed < ?`,
    [...pred.params, cutoff],
  ) as Array<{ name: string; lastUsed: string }> : []

  return {
    bodiesOverTime: bodiesOverTime.map((r) => ({ month: r.month, body: r.body, count: r.n })),
    topLenses: topLenses.map((r) => ({ lens: r.lens, count: r.n })),
    topCombos: topCombos.map((r) => ({
      body: r.body, lens: r.lens, count: r.n,
      firstUsed: r.firstUsed, lastUsed: r.lastUsed,
    })),
    retired: [
      ...retiredBodies.map((r) => ({ kind: 'body' as const, name: r.name, lastUsed: r.lastUsed })),
      ...retiredLenses.map((r) => ({ kind: 'lens' as const, name: r.name, lastUsed: r.lastUsed })),
    ],
  }
}

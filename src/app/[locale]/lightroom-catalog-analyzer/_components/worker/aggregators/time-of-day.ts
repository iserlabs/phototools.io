import type { TimeOfDayBlock, AnalysisFilter } from '@/lib/lrcat/types'
import { buildFilterPredicate } from '../filter'

interface DbLike {
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
}

const TOP_GEAR_LIMIT = 6

/**
 * v1 sun-angle buckets are a crude clock-hour proxy. Real sun-angle inference
 * requires sunrise/sunset lookup per (lat, lng, date) — out of scope for v1.
 * The UI labels this honestly ("X% of your catalog has GPS — sun-angle
 * breakdown is approximate based on clock hour").
 *
 * Bucket mapping (local clock hour):
 *   hours 5–7  → goldenHour (morning side)
 *   hours 8–16 → midday
 *   hours 17–19 → goldenHour (evening side)
 *   hours 4 and 20 → blueHour
 *   hours 21–3 → night
 */
function classifySunAngleByHour(hour: number): 'goldenHour' | 'blueHour' | 'midday' | 'night' {
  if (hour >= 5 && hour <= 7) return 'goldenHour'
  if (hour >= 17 && hour <= 19) return 'goldenHour'
  if (hour >= 8 && hour <= 16) return 'midday'
  if (hour === 4 || hour === 20) return 'blueHour'
  return 'night'
}

export function aggregateTimeOfDay(db: DbLike, filter?: AnalysisFilter): TimeOfDayBlock {
  const pred = buildFilterPredicate(filter)
  const where = pred.sql || ''

  // Build the all-photos clock-hour histogram. Each row contributes to one of 24 buckets.
  const clockRows = db.selectObjects(
    `SELECT CAST(substr(img.captureTime, 12, 2) AS INTEGER) AS hour, COUNT(*) AS n
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE img.captureTime IS NOT NULL ${where}
      GROUP BY hour`,
    pred.params,
  ) as Array<{ hour: number; n: number }>

  const byClockHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }))
  for (const row of clockRows) {
    if (row.hour >= 0 && row.hour < 24) byClockHour[row.hour].count = row.n
  }

  // Sun-angle buckets: GPS-only.
  const gpsRows = db.selectObjects(
    `SELECT CAST(substr(img.captureTime, 12, 2) AS INTEGER) AS hour, COUNT(*) AS n
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE img.captureTime IS NOT NULL
        AND exif.gpsLatitude IS NOT NULL AND exif.gpsLongitude IS NOT NULL ${where}
      GROUP BY hour`,
    pred.params,
  ) as Array<{ hour: number; n: number }>

  const bySunAngle = { gpsPhotosCount: 0, goldenHour: 0, blueHour: 0, midday: 0, night: 0 }
  for (const row of gpsRows) {
    if (row.hour < 0 || row.hour > 23) continue
    bySunAngle.gpsPhotosCount += row.n
    bySunAngle[classifySunAngleByHour(row.hour)] += row.n
  }

  // Per-gear (lens) clock-hour breakdown — top TOP_GEAR_LIMIT lenses by total.
  const topGearRows = db.selectObjects(
    `SELECT lens.value AS gear, COUNT(*) AS n
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
      WHERE lens.value IS NOT NULL AND img.captureTime IS NOT NULL ${where}
      GROUP BY lens.value
      ORDER BY n DESC
      LIMIT ${TOP_GEAR_LIMIT}`,
    pred.params,
  ) as Array<{ gear: string; n: number }>

  const perGearByClockHour = topGearRows.map((entry) => {
    const histRows = db.selectObjects(
      `SELECT CAST(substr(img.captureTime, 12, 2) AS INTEGER) AS hour, COUNT(*) AS n
         FROM Adobe_images img
         JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
         JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
         LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
        WHERE lens.value = ? AND img.captureTime IS NOT NULL ${where}
        GROUP BY hour`,
      [entry.gear, ...pred.params],
    ) as Array<{ hour: number; n: number }>

    const histogram = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }))
    for (const row of histRows) {
      if (row.hour >= 0 && row.hour < 24) histogram[row.hour].count = row.n
    }
    return { gear: entry.gear, histogram }
  })

  return { byClockHour, bySunAngle, perGearByClockHour }
}

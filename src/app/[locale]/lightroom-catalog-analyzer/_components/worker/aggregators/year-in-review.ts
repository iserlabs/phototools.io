import type { YearInReviewBlock } from '@/lib/lrcat/types'

interface DbLike {
  selectObject: (sql: string, params?: unknown[]) => unknown | undefined
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
}

const TOP_GEAR_LIMIT = 5

/**
 * Year-in-Review aggregator (spec §5.1 #1).
 *
 * Self-scoped: ignores the global filter, instead applying a hard
 * `strftime('%Y', img.captureTime) = ?` predicate so cache invalidation
 * is bound to the year picker, not the global filter.
 *
 * Composes per-domain query fragments inline rather than calling the
 * lower-level aggregator functions — this avoids 8 separate full scans
 * when the year picker changes.
 */
export function aggregateYearInReview(db: DbLike, year: number): YearInReviewBlock {
  const y = String(year)

  const totals = db.selectObject(
    `SELECT COUNT(*) AS total,
            COUNT(DISTINCT substr(img.captureTime, 1, 10)) AS daysShot
       FROM Adobe_images img
      WHERE strftime('%Y', img.captureTime) = ?`,
    [y],
  ) as { total: number; daysShot: number }

  if (totals.total === 0) {
    return emptyYear(year)
  }

  const topBody = db.selectObject(
    `SELECT cam.value AS name, COUNT(*) AS n
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
      WHERE strftime('%Y', img.captureTime) = ? AND cam.value IS NOT NULL
      GROUP BY cam.value
      ORDER BY n DESC
      LIMIT 1`,
    [y],
  ) as { name: string; n: number } | undefined

  const topLens = db.selectObject(
    `SELECT lens.value AS name, COUNT(*) AS n
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE strftime('%Y', img.captureTime) = ? AND lens.value IS NOT NULL
      GROUP BY lens.value
      ORDER BY n DESC
      LIMIT 1`,
    [y],
  ) as { name: string; n: number } | undefined

  const topFocal = db.selectObject(
    `SELECT ROUND(exif.focalLength) AS fl, COUNT(*) AS n
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
      WHERE strftime('%Y', img.captureTime) = ? AND exif.focalLength IS NOT NULL
      GROUP BY fl
      ORDER BY n DESC
      LIMIT 1`,
    [y],
  ) as { fl: number; n: number } | undefined

  const topAperture = db.selectObject(
    `SELECT exif.aperture AS ap, COUNT(*) AS n
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
      WHERE strftime('%Y', img.captureTime) = ? AND exif.aperture IS NOT NULL
      GROUP BY ROUND(exif.aperture, 1)
      ORDER BY n DESC
      LIMIT 1`,
    [y],
  ) as { ap: number; n: number } | undefined

  const monthlyRows = db.selectObjects(
    `SELECT substr(img.captureTime, 1, 7) AS month, COUNT(*) AS n
       FROM Adobe_images img
      WHERE strftime('%Y', img.captureTime) = ?
      GROUP BY month
      ORDER BY month ASC`,
    [y],
  ) as Array<{ month: string; n: number }>

  // Zero-fill all 12 months so the sparkline has a stable 12-point baseline.
  const monthlyVolume = Array.from({ length: 12 }, (_, i) => {
    const key = `${y}-${String(i + 1).padStart(2, '0')}`
    const row = monthlyRows.find((r) => r.month === key)
    return { month: key, count: row?.n ?? 0 }
  })

  const mostProlific = [...monthlyVolume].sort((a, b) => b.count - a.count)[0]
  const mostProlificMonth = mostProlific.count > 0 ? mostProlific : null

  const topLensInMonth = mostProlificMonth
    ? ((db.selectObject(
        `SELECT lens.value AS name, COUNT(*) AS n
           FROM Adobe_images img
           JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
           JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
          WHERE substr(img.captureTime, 1, 7) = ? AND lens.value IS NOT NULL
          GROUP BY lens.value
          ORDER BY n DESC
          LIMIT 1`,
        [mostProlificMonth.month],
      ) as { name: string; n: number } | undefined)?.name ?? null)
    : null

  // Top gear share = top 5 lens+body combos as % of yearly total.
  const gearRows = db.selectObjects(
    `SELECT cam.value || ' + ' || lens.value AS gear, COUNT(*) AS n
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE strftime('%Y', img.captureTime) = ?
        AND cam.value IS NOT NULL AND lens.value IS NOT NULL
      GROUP BY gear
      ORDER BY n DESC
      LIMIT ${TOP_GEAR_LIMIT}`,
    [y],
  ) as Array<{ gear: string; n: number }>
  const topGearShare = gearRows.map((r) => ({
    gear: r.gear,
    pct: Number(((r.n / totals.total) * 100).toFixed(2)),
  }))

  // Time-of-day buckets: morning (5-11), midday (12-16), evening (17-20), night (21-4)
  const hourRows = db.selectObjects(
    `SELECT CAST(substr(img.captureTime, 12, 2) AS INTEGER) AS hour, COUNT(*) AS n
       FROM Adobe_images img
      WHERE strftime('%Y', img.captureTime) = ?
      GROUP BY hour`,
    [y],
  ) as Array<{ hour: number; n: number }>
  const buckets: Record<'morning' | 'midday' | 'evening' | 'night', number> = {
    morning: 0, midday: 0, evening: 0, night: 0,
  }
  for (const { hour, n } of hourRows) {
    if (hour >= 5 && hour <= 11) buckets.morning += n
    else if (hour >= 12 && hour <= 16) buckets.midday += n
    else if (hour >= 17 && hour <= 20) buckets.evening += n
    else buckets.night += n
  }
  const timeOfDayShare = (['morning', 'midday', 'evening', 'night'] as const).map((bucket) => ({
    bucket,
    pct: Number(((buckets[bucket] / totals.total) * 100).toFixed(2)),
  }))

  return {
    year,
    totalPhotos: totals.total,
    daysShot: totals.daysShot,
    topBody: topBody?.name ?? null,
    topLens: topLens?.name ?? null,
    topFocalLengthMm: topFocal ? Math.round(topFocal.fl) : null,
    topApertureFNumber: topAperture ? Number(topAperture.ap.toFixed(2)) : null,
    mostProlificMonth,
    avgShotsPerDay: totals.daysShot > 0 ? Number((totals.total / totals.daysShot).toFixed(2)) : 0,
    monthlyVolume,
    topGearShare,
    timeOfDayShare,
    topLensInMonth,
  }
}

function emptyYear(year: number): YearInReviewBlock {
  return {
    year,
    totalPhotos: 0,
    daysShot: 0,
    topBody: null,
    topLens: null,
    topFocalLengthMm: null,
    topApertureFNumber: null,
    mostProlificMonth: null,
    avgShotsPerDay: 0,
    monthlyVolume: Array.from({ length: 12 }, (_, i) => ({
      month: `${year}-${String(i + 1).padStart(2, '0')}`,
      count: 0,
    })),
    topGearShare: [],
    timeOfDayShare: [
      { bucket: 'morning', pct: 0 },
      { bucket: 'midday', pct: 0 },
      { bucket: 'evening', pct: 0 },
      { bucket: 'night', pct: 0 },
    ],
    topLensInMonth: null,
  }
}

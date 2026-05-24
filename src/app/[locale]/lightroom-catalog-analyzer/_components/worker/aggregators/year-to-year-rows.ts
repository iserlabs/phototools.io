/**
 * Individual row-computer functions for the Year-to-Year aggregator.
 *
 * Extracted from year-to-year.ts to keep both files under the 200-line cap.
 * Each function queries a single stat for a single calendar year.
 */

interface DbLike {
  selectObject: (sql: string, params?: unknown[]) => unknown | undefined
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
}

export interface RowSpec {
  statKey: string
  label: string
  format: 'int' | 'pct' | 'str' | 'float'
  compute: (db: DbLike, year: number) => number | string
}

function countPhotos(db: DbLike, year: number): number {
  const r = db.selectObject(
    `SELECT COUNT(*) AS n FROM Adobe_images img WHERE strftime('%Y', img.captureTime) = ?`,
    [String(year)],
  ) as { n: number }
  return r.n
}

function countDaysShot(db: DbLike, year: number): number {
  const r = db.selectObject(
    `SELECT COUNT(DISTINCT substr(img.captureTime, 1, 10)) AS n
       FROM Adobe_images img WHERE strftime('%Y', img.captureTime) = ?`,
    [String(year)],
  ) as { n: number }
  return r.n
}

function topBody(db: DbLike, year: number): string {
  const r = db.selectObject(
    `SELECT cam.value AS name FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
      WHERE strftime('%Y', img.captureTime) = ? AND cam.value IS NOT NULL
      GROUP BY cam.value ORDER BY COUNT(*) DESC LIMIT 1`,
    [String(year)],
  ) as { name: string } | undefined
  return r?.name ?? '—'
}

function topLens(db: DbLike, year: number): string {
  const r = db.selectObject(
    `SELECT lens.value AS name FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE strftime('%Y', img.captureTime) = ? AND lens.value IS NOT NULL
      GROUP BY lens.value ORDER BY COUNT(*) DESC LIMIT 1`,
    [String(year)],
  ) as { name: string } | undefined
  return r?.name ?? '—'
}

function topFocal(db: DbLike, year: number): number {
  const r = db.selectObject(
    `SELECT ROUND(exif.focalLength) AS fl FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
      WHERE strftime('%Y', img.captureTime) = ? AND exif.focalLength IS NOT NULL
      GROUP BY fl ORDER BY COUNT(*) DESC LIMIT 1`,
    [String(year)],
  ) as { fl: number } | undefined
  return r ? Math.round(r.fl) : 0
}

function topAperture(db: DbLike, year: number): number {
  const r = db.selectObject(
    `SELECT exif.aperture AS ap FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
      WHERE strftime('%Y', img.captureTime) = ? AND exif.aperture IS NOT NULL
      GROUP BY ROUND(exif.aperture, 1) ORDER BY COUNT(*) DESC LIMIT 1`,
    [String(year)],
  ) as { ap: number } | undefined
  return r ? Number(r.ap.toFixed(2)) : 0
}

function pctRated4Plus(db: DbLike, year: number): number {
  const totals = db.selectObject(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN img.rating >= 4 THEN 1 ELSE 0 END) AS hi
       FROM Adobe_images img
      WHERE strftime('%Y', img.captureTime) = ?`,
    [String(year)],
  ) as { total: number; hi: number }
  if (totals.total === 0) return 0
  return Number(((totals.hi / totals.total) * 100).toFixed(1))
}

function timeOfDayMix(db: DbLike, year: number): string {
  const buckets = { morning: 0, midday: 0, evening: 0, night: 0 }
  const rows = db.selectObjects(
    `SELECT CAST(substr(img.captureTime, 12, 2) AS INTEGER) AS hour, COUNT(*) AS n
       FROM Adobe_images img
      WHERE strftime('%Y', img.captureTime) = ?
      GROUP BY hour`,
    [String(year)],
  ) as Array<{ hour: number; n: number }>
  let total = 0
  for (const { hour, n } of rows) {
    total += n
    if (hour >= 5 && hour <= 11) buckets.morning += n
    else if (hour >= 12 && hour <= 16) buckets.midday += n
    else if (hour >= 17 && hour <= 20) buckets.evening += n
    else buckets.night += n
  }
  if (total === 0) return '—'
  const top = (Object.entries(buckets) as Array<[keyof typeof buckets, number]>)
    .sort((a, b) => b[1] - a[1])[0]
  return `${top[0]} (${Math.round((top[1] / total) * 100)}%)`
}

function editIntensityScore(db: DbLike, year: number): number {
  // Lightweight proxy: % of photos with develop settings touched, scaled to 0..100.
  const r = db.selectObject(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN d.hasDevelopAdjustments = 1 THEN 1 ELSE 0 END) AS edited
       FROM Adobe_images img
       LEFT JOIN AgHarvestedDevelopMetadata d ON d.image = img.id_local
      WHERE strftime('%Y', img.captureTime) = ?`,
    [String(year)],
  ) as { total: number; edited: number }
  if (r.total === 0) return 0
  return Number(((r.edited / r.total) * 100).toFixed(1))
}

function keywordsPerPhoto(db: DbLike, year: number): number {
  const r = db.selectObject(
    `SELECT COUNT(*) AS total,
            (SELECT COUNT(*) FROM AgLibraryKeywordImage ki
              JOIN Adobe_images img2 ON img2.id_local = ki.image
              WHERE strftime('%Y', img2.captureTime) = ?) AS tags
       FROM Adobe_images img
      WHERE strftime('%Y', img.captureTime) = ?`,
    [String(year), String(year)],
  ) as { total: number; tags: number }
  if (r.total === 0) return 0
  return Number((r.tags / r.total).toFixed(2))
}

export const ROW_SPECS: RowSpec[] = [
  { statKey: 'totalPhotos',     label: 'Total photos',     format: 'int',   compute: countPhotos },
  { statKey: 'daysShot',        label: 'Days shot',        format: 'int',   compute: countDaysShot },
  { statKey: 'topBody',         label: 'Top body',         format: 'str',   compute: topBody },
  { statKey: 'topLens',         label: 'Top lens',         format: 'str',   compute: topLens },
  { statKey: 'topFocalLengthMm', label: 'Top focal length', format: 'int',  compute: topFocal },
  { statKey: 'topApertureFNumber', label: 'Top aperture',  format: 'float', compute: topAperture },
  { statKey: 'pctRated4Plus',   label: '% rated ≥4',       format: 'pct',  compute: pctRated4Plus },
  { statKey: 'timeOfDayMix',    label: 'Time of day',      format: 'str',  compute: timeOfDayMix },
  { statKey: 'editIntensityScore', label: 'Edit intensity', format: 'float', compute: editIntensityScore },
  { statKey: 'keywordsPerPhoto', label: 'Keywords/photo',  format: 'float', compute: keywordsPerPhoto },
]

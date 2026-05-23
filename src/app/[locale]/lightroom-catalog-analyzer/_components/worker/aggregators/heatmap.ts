import type { HeatmapBlock, AnalysisFilter } from '@/lib/lrcat/types'
import { buildFilterPredicate } from '../filter'

interface DbLike {
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
}

/**
 * Shooting heatmap aggregator. For each day with ≥1 photo, returns
 * { date, count, topLens }. Days with no photos are simply absent —
 * the UI fills in zeros for the GitHub-style grid.
 *
 * `years` is the sorted list of distinct years present in the (filtered)
 * catalog, so the UI knows how many yearly grids to stack.
 */
export function aggregateHeatmap(db: DbLike, filter?: AnalysisFilter): HeatmapBlock {
  const pred = buildFilterPredicate(filter)
  const where = pred.sql || ''

  // Day counts.
  const dayRows = db.selectObjects(
    `SELECT substr(img.captureTime, 1, 10) AS date, COUNT(*) AS n
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE img.captureTime IS NOT NULL ${where}
      GROUP BY date
      ORDER BY date ASC`,
    pred.params,
  ) as Array<{ date: string; n: number }>

  // Top lens per day. For days where no row has a lens, the day will not
  // appear in lensRows — we left-join in-memory below.
  const lensRows = db.selectObjects(
    `SELECT date, lens, n FROM (
       SELECT substr(img.captureTime, 1, 10) AS date,
              lens.value AS lens,
              COUNT(*) AS n,
              ROW_NUMBER() OVER (PARTITION BY substr(img.captureTime, 1, 10) ORDER BY COUNT(*) DESC) AS rk
         FROM Adobe_images img
         JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
         JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
         LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
        WHERE img.captureTime IS NOT NULL AND lens.value IS NOT NULL ${where}
        GROUP BY date, lens.value
     ) WHERE rk = 1`,
    pred.params,
  ) as Array<{ date: string; lens: string; n: number }>

  const topLensByDay = new Map<string, string>()
  for (const r of lensRows) topLensByDay.set(r.date, r.lens)

  const byDay = dayRows.map((r) => ({
    date: r.date,
    count: r.n,
    topLens: topLensByDay.get(r.date) ?? null,
  }))

  const years = [...new Set(byDay.map((d) => Number(d.date.slice(0, 4))))].sort((a, b) => a - b)

  return { byDay, years }
}

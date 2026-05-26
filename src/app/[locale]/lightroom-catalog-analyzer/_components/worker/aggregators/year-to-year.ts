import type { YearToYearBlock } from '@/lib/lrcat/types'
import {
  countPhotos, countDaysShot, topBody, topLens, topFocal,
  topAperture, pctRated4Plus, timeOfDayMix, editIntensityScore, keywordsPerPhoto,
} from './year-to-year-computers'

interface DbLike {
  selectObject: (sql: string, params?: unknown[]) => unknown | undefined
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
}

interface RowSpec {
  statKey: string
  label: string
  format: 'int' | 'pct' | 'str' | 'float'
  compute: (db: DbLike, year: number) => number | string
}

const ROW_SPECS: RowSpec[] = [
  { statKey: 'totalPhotos',     label: 'Total photos',     format: 'int',   compute: countPhotos },
  { statKey: 'daysShot',        label: 'Days shot',        format: 'int',   compute: countDaysShot },
  { statKey: 'topBody',         label: 'Top body',         format: 'str',   compute: topBody },
  { statKey: 'topLens',         label: 'Top lens',         format: 'str',   compute: topLens },
  { statKey: 'topFocalLengthMm', label: 'Top focal length', format: 'int', compute: topFocal },
  { statKey: 'topApertureFNumber', label: 'Top aperture',  format: 'float', compute: topAperture },
  { statKey: 'pctRated4Plus',   label: '% rated ≥4',       format: 'pct',   compute: pctRated4Plus },
  { statKey: 'timeOfDayMix',    label: 'Time of day',      format: 'str',   compute: timeOfDayMix },
  { statKey: 'editIntensityScore', label: 'Edit intensity', format: 'float', compute: editIntensityScore },
  { statKey: 'keywordsPerPhoto', label: 'Keywords/photo',  format: 'float', compute: keywordsPerPhoto },
]

/**
 * Year-to-Year Comparison aggregator (spec §5.1 #2).
 *
 * Returns the most recent N calendar years of the catalog as columns,
 * with one row per scorecard stat. Deltas are (this - prev) / prev * 100;
 * the oldest year has null delta. "biggestShift" surfaces the row with
 * the largest absolute delta in the most-recent year.
 *
 * Ignores the global filter (own scope).
 */
export function aggregateYearToYear(db: DbLike, n = 3): YearToYearBlock {
  const yearRows = db.selectObjects(
    `SELECT DISTINCT CAST(strftime('%Y', img.captureTime) AS INTEGER) AS y
       FROM Adobe_images img
      WHERE img.captureTime IS NOT NULL
      ORDER BY y DESC
      LIMIT ?`,
    [n],
  ) as Array<{ y: number }>

  if (yearRows.length === 0) {
    return { years: [], rows: [], biggestShift: null }
  }

  const years = yearRows.map((r) => r.y)

  const rows = ROW_SPECS.map((spec) => {
    const values = years.map((year) => spec.compute(db, year))
    const deltas = values.map((curr, i) => {
      const priorIdx = i + 1
      if (priorIdx >= values.length) return null
      const a = Number(curr)
      const b = Number(values[priorIdx])
      if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null
      return Number((((a - b) / b) * 100).toFixed(1))
    })
    return { statKey: spec.statKey, label: spec.label, values, deltas }
  })

  // biggestShift = row with the largest absolute delta in the most-recent year (index 0).
  let biggestShift: YearToYearBlock['biggestShift'] = null
  let bestAbs = -1
  for (const row of rows) {
    const d = row.deltas[0]
    if (d == null) continue
    if (Math.abs(d) > bestAbs) {
      bestAbs = Math.abs(d)
      const sign = d > 0 ? '+' : ''
      biggestShift = {
        statKey: row.statKey,
        year: years[0],
        deltaText: `${sign}${d}%`,
      }
    }
  }

  return { years, rows, biggestShift }
}

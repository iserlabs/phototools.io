import type { EditIntensityBlock, AnalysisFilter } from '@/lib/lrcat/types'
import { buildFilterPredicate } from '../filter'
import { parseDevelopSettings } from '../develop-settings-parser'

interface DbLike {
  selectObject: (sql: string, params?: unknown[]) => unknown | undefined
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
}

const SAMPLE_THRESHOLD = 50_000
const SAMPLE_MODULUS = 20         // (id_local % 20) === 0 → ~5% systematic

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function scoreOne(parsed: ReturnType<typeof parseDevelopSettings>, presetApplied: boolean): number {
  const component =
    20 * Math.min(Math.abs(parsed.exposureShiftStops) / 2, 1) +
    20 * Math.min(parsed.cropPct / 50, 1) +
    20 * (parsed.hasLocalAdjustments ? 1 : 0) +
    20 * (presetApplied ? 1 : 0) +
    20 * Math.min(parsed.slidersTouched / 10, 1)
  return Math.round(clamp(component, 0, 100))
}

function detectPreset(blob: string): boolean {
  return blob.includes('PresetType') || /\bPreset\s*=\s*"/.test(blob)
}

function extractPresetName(blob: string): string | null {
  const m = blob.match(/\bPresetType\s*=\s*"([^"]+)"/) ?? blob.match(/\bPreset\s*=\s*"([^"]+)"/)
  return m ? m[1] : null
}

function pct(n: number, d: number): number {
  if (d <= 0) return 0
  return Math.round((n / d) * 1000) / 10
}

// m-8 (audit, spec §4.3): we deliberately do NOT pull img.id_local into JS here.
// The deterministic 5% sample uses `img.id_local % 20` entirely SQL-side (SQLite does
// the integer math), so there is no risk of identifier overflow past 2^53 in JS.
interface DevRow {
  text: string
  captureTime: string
  body: string | null
  lens: string | null
}

export function aggregateEditIntensity(db: DbLike, filter?: AnalysisFilter): EditIntensityBlock {
  const pred = buildFilterPredicate(filter)
  const where = pred.sql || ''

  // Decide sampling based on the (unfiltered) population size of develop-settings rows.
  // Sampling decision is independent of the filter so it's stable across re-runs.
  const popCount = (db.selectObject(
    `SELECT COUNT(*) AS n FROM Adobe_imageDevelopSettings`,
  ) as { n: number } | undefined)?.n ?? 0
  const sampled = popCount > SAMPLE_THRESHOLD && !filter
  const sampleClause = sampled ? `AND (img.id_local % ${SAMPLE_MODULUS}) = 0` : ''

  const rows = db.selectObjects(
    `SELECT dev.text AS text,
            img.captureTime AS captureTime,
            cam.value AS body,
            lens.value AS lens
       FROM Adobe_imageDevelopSettings dev
       JOIN Adobe_images img ON img.id_local = dev.image
       LEFT JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
       LEFT JOIN AgInternedExifLens lens ON lens.id_local = exif.lensRef
      WHERE dev.text IS NOT NULL ${sampleClause} ${where}`,
    pred.params,
  ) as DevRow[]

  if (rows.length === 0) {
    return {
      avgExposureShiftStops: 0,
      avgCropPct: 0,
      pctWithLocalAdjustments: 0,
      pctWithPresets: 0,
      topPresets: [],
      scoreByMonth: [],
      perGearScores: [],
      sampled,
      sampleSize: 0,
    }
  }

  let sumExposure = 0
  let sumCrop = 0
  let countLocal = 0
  let countPreset = 0
  const presetCounts = new Map<string, number>()
  const monthBuckets = new Map<string, { sum: number; n: number }>()
  const gearBuckets = new Map<string, { sum: number; n: number }>()

  for (const row of rows) {
    const parsed = parseDevelopSettings(row.text)
    const presetApplied = detectPreset(row.text)
    const score = scoreOne(parsed, presetApplied)

    sumExposure += parsed.exposureShiftStops
    sumCrop += parsed.cropPct
    if (parsed.hasLocalAdjustments) countLocal++
    if (presetApplied) {
      countPreset++
      const name = extractPresetName(row.text)
      if (name) presetCounts.set(name, (presetCounts.get(name) ?? 0) + 1)
    }

    if (row.captureTime && row.captureTime.length >= 7) {
      const month = row.captureTime.slice(0, 7)
      const bucket = monthBuckets.get(month) ?? { sum: 0, n: 0 }
      bucket.sum += score
      bucket.n += 1
      monthBuckets.set(month, bucket)
    }

    if (row.body) {
      const bucket = gearBuckets.get(row.body) ?? { sum: 0, n: 0 }
      bucket.sum += score
      bucket.n += 1
      gearBuckets.set(row.body, bucket)
    }
  }

  const n = rows.length

  const scoreByMonth = [...monthBuckets.entries()]
    .map(([month, b]) => ({ month, score: Math.round(b.sum / b.n) }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const perGearScores = [...gearBuckets.entries()]
    .map(([gear, b]) => ({ gear, score: Math.round(b.sum / b.n) }))
    .sort((a, b) => b.score - a.score)

  const topPresets = [...presetCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    avgExposureShiftStops: Math.round((sumExposure / n) * 1000) / 1000,
    avgCropPct: Math.round((sumCrop / n) * 100) / 100,
    pctWithLocalAdjustments: pct(countLocal, n),
    pctWithPresets: pct(countPreset, n),
    topPresets,
    scoreByMonth,
    perGearScores,
    sampled,
    sampleSize: n,
  }
}

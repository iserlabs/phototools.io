import type { BurstsBlock, AnalysisFilter } from '@/lib/lrcat/types'
import { buildFilterPredicate } from '../filter'

interface DbLike {
  selectObject: (sql: string, params?: unknown[]) => unknown | undefined
  selectObjects: (sql: string, params?: unknown[]) => unknown[]
}

const BURST_GAP_MS = 1000        // strictly less than 1s = same burst
const MIN_BURST_SIZE = 3

// m-8 (audit, spec §4.3): we do NOT select img.id_local into JS. Clustering keys on
// captureTime + cameraKey only; the id_local is used solely as a stable SQL-side
// ORDER BY tiebreaker, so no identifier ever undergoes JS arithmetic.
interface Row {
  captureTime: string
  cameraKey: string                // serial OR model fallback
  rating: number | null
}

function pct(n: number, d: number): number {
  if (d <= 0) return 0
  return Math.round((n / d) * 1000) / 10
}

export function aggregateBursts(db: DbLike, filter?: AnalysisFilter): BurstsBlock {
  const pred = buildFilterPredicate(filter)
  const where = pred.sql || ''

  const rows = db.selectObjects(
    `SELECT img.captureTime AS captureTime,
            COALESCE(cam.value, '') AS cameraKey,
            img.rating AS rating
       FROM Adobe_images img
       JOIN AgHarvestedExifMetadata exif ON exif.image = img.id_local
       LEFT JOIN AgInternedExifCameraModel cam ON cam.id_local = exif.cameraModelRef
      WHERE img.captureTime IS NOT NULL ${where}
      ORDER BY img.captureTime ASC, img.id_local ASC`,
    pred.params,
  ) as Row[]

  if (rows.length === 0) {
    return {
      totalBursts: 0,
      totalPhotosInBursts: 0,
      pctInBursts: 0,
      longestBurst: 0,
      lengthHistogram: [],
      keeperRatePct: 0,
      singleShotKeeperRatePct: 0,
    }
  }

  // Cluster consecutive rows.
  const clusters: Row[][] = []
  let current: Row[] = [rows[0]]
  for (let i = 1; i < rows.length; i++) {
    const prev = current[current.length - 1]
    const next = rows[i]
    const gap = new Date(next.captureTime).getTime() - new Date(prev.captureTime).getTime()
    const sameCamera = next.cameraKey === prev.cameraKey && next.cameraKey !== ''
    if (gap < BURST_GAP_MS && sameCamera) {
      current.push(next)
    } else {
      clusters.push(current)
      current = [next]
    }
  }
  clusters.push(current)

  const bursts = clusters.filter((c) => c.length >= MIN_BURST_SIZE)
  const singletons = clusters.filter((c) => c.length < MIN_BURST_SIZE).flat()

  const totalPhotosInBursts = bursts.reduce((sum, b) => sum + b.length, 0)
  const longest = bursts.reduce((m, b) => Math.max(m, b.length), 0)

  const lenCounts = new Map<number, number>()
  for (const b of bursts) lenCounts.set(b.length, (lenCounts.get(b.length) ?? 0) + 1)

  const burstKeepers = bursts.flat().filter((r) => (r.rating ?? 0) >= 4).length
  const singleKeepers = singletons.filter((r) => (r.rating ?? 0) >= 4).length

  return {
    totalBursts: bursts.length,
    totalPhotosInBursts,
    pctInBursts: pct(totalPhotosInBursts, rows.length),
    longestBurst: longest,
    lengthHistogram: [...lenCounts.entries()]
      .map(([length, count]) => ({ length, count }))
      .sort((a, b) => a.length - b.length),
    keeperRatePct: pct(burstKeepers, totalPhotosInBursts),
    singleShotKeeperRatePct: pct(singleKeepers, singletons.length),
  }
}

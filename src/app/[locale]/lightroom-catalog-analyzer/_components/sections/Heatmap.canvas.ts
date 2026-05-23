import type { HeatmapBlock } from '@/lib/lrcat/types'

export interface DrawHeatmapOpts {
  width: number
  height: number
  cellSize?: number
  gap?: number
  colorScale?: (intensity: number) => string // intensity ∈ [0,1]
  textColor?: string
}

export interface HeatmapHitBox {
  date: string
  count: number
  topLens: string | null
  x: number
  y: number
  w: number
  h: number
}

const DEFAULT_SCALE = (i: number): string => {
  if (i <= 0) return '#1a1a1a'
  const lightness = 18 + i * 50
  return `hsl(210 70% ${lightness}%)`
}

/**
 * Draw a GitHub-style contribution heatmap. Returns hit-boxes so the React
 * layer can do pointer→tooltip and click→drilldown.
 */
export function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  block: HeatmapBlock,
  opts: DrawHeatmapOpts,
): HeatmapHitBox[] {
  const { width, height } = opts
  const cellSize = opts.cellSize ?? 10
  const gap = opts.gap ?? 2
  const colorScale = opts.colorScale ?? DEFAULT_SCALE
  const textColor = opts.textColor ?? '#888'

  ctx.clearRect(0, 0, width, height)
  if (block.byDay.length === 0) return []

  const byDate = new Map(block.byDay.map((d) => [d.date, d]))
  const maxCount = Math.max(1, ...block.byDay.map((d) => d.count))

  ctx.font = '11px system-ui, sans-serif'
  ctx.fillStyle = textColor
  ctx.textAlign = 'left'

  const hitBoxes: HeatmapHitBox[] = []
  const padX = 32
  let y = 8

  for (const year of block.years) {
    ctx.fillStyle = textColor
    ctx.fillText(String(year), 0, y + cellSize)
    const startDate = new Date(year, 0, 1)
    const dow0 = startDate.getDay() // 0=Sun
    for (let day = 0; day < 366; day++) {
      const d = new Date(year, 0, 1 + day)
      if (d.getFullYear() !== year) break
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const dow = d.getDay()
      const week = Math.floor((day + dow0) / 7)
      const x = padX + week * (cellSize + gap)
      const yy = y + dow * (cellSize + gap)
      const data = byDate.get(iso)
      const count = data?.count ?? 0
      ctx.fillStyle = colorScale(count / maxCount)
      ctx.fillRect(x, yy, cellSize, cellSize)
      if (count > 0) {
        hitBoxes.push({
          date: iso,
          count,
          topLens: data?.topLens ?? null,
          x,
          y: yy,
          w: cellSize,
          h: cellSize,
        })
      }
    }
    y += 7 * (cellSize + gap) + 18
  }
  return hitBoxes
}

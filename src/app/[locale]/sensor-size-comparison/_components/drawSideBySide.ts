import type { ResolvedSensor } from './sensorSizeTypes'
import { POPULAR_MODELS } from '@/lib/data/sensors'
import { rgba, roundRect } from './sensorSizeHelpers'

function drawSideBySideRow(
  ctx: CanvasRenderingContext2D,
  W: number, pad: number,
  sensors: ResolvedSensor[],
  scale: number,
  baseY: number,
  alphaMap?: Map<string, number>,
) {
  const gap = 16

  ctx.font = '10px system-ui, sans-serif'
  const minTextWidths = sensors.map(s => {
    const nameLabel = s.name.length > 14 ? s.name.replace(' (', '\n(') : s.name
    const nameW = Math.max(...nameLabel.split('\n').map(l => ctx.measureText(l).width))
    ctx.font = '9px system-ui, sans-serif'
    const models = POPULAR_MODELS[s.id] ?? []
    const modelW = models.length > 0 ? Math.max(...models.map(m => ctx.measureText(m).width)) : 0
    ctx.font = '10px system-ui, sans-serif'
    return Math.max(nameW, modelW) + 8
  })

  const isMobileRow = W < 600
  const equalColW = isMobileRow ? (W - pad * 2 - (sensors.length - 1) * gap) / Math.max(sensors.length, 1) : 0
  const colWidths = isMobileRow
    ? sensors.map(() => equalColW)
    : sensors.map((s, i) => Math.max(s.w * scale, minTextWidths[i]))
  const totalGap = (sensors.length - 1) * gap
  const totalColW = colWidths.reduce((a, b) => a + b, 0) + totalGap
  let x = (W - totalColW) / 2

  for (let si = 0; si < sensors.length; si++) {
    const s = sensors[si]
    const a = alphaMap?.get(s.id) ?? 1
    const colW = colWidths[si]
    const rw = s.w * scale
    const rh = s.h * scale
    const r = Math.min(4, rw * 0.03)
    const colCx = x + colW / 2
    const rx = colCx - rw / 2
    const ry = baseY - rh

    ctx.save()
    ctx.globalAlpha = a

    roundRect(ctx, rx, ry, rw, rh, r)
    ctx.fillStyle = rgba(s.color, 0.12)
    ctx.fill()

    roundRect(ctx, rx, ry, rw, rh, r)
    ctx.strokeStyle = rgba(s.color, 0.7)
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = rgba(s.color, 0.5)
    ctx.font = '9px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    if (rw > 40) {
      ctx.fillText(`${s.w}×${s.h}`, colCx, ry + rh - 4)
    }

    ctx.fillStyle = s.color
    ctx.font = '10px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const nameLabel = s.name.length > 14 ? s.name.replace(' (', '\n(') : s.name
    const lines = nameLabel.split('\n')
    lines.forEach((line, i) => {
      ctx.fillText(line, colCx, baseY + 6 + i * 13)
    })

    const models = POPULAR_MODELS[s.id] ?? []
    if (models.length > 0) {
      ctx.fillStyle = rgba(s.color, 0.45)
      ctx.font = '9px system-ui, sans-serif'
      const modelStartY = baseY + 6 + lines.length * 13 + 4
      for (let mi = 0; mi < models.length; mi++) {
        ctx.fillText(models[mi], colCx, modelStartY + mi * 12)
      }
    }

    ctx.restore()
    x += colW + gap
  }
}

function computeMinTextWidths(
  ctx: CanvasRenderingContext2D,
  sensors: ResolvedSensor[],
): number[] {
  ctx.font = '10px system-ui, sans-serif'
  return sensors.map(s => {
    const nameLabel = s.name.length > 14 ? s.name.replace(' (', '\n(') : s.name
    const nameW = Math.max(...nameLabel.split('\n').map(l => ctx.measureText(l).width))
    ctx.font = '9px system-ui, sans-serif'
    const models = POPULAR_MODELS[s.id] ?? []
    const modelW = models.length > 0 ? Math.max(...models.map(m => ctx.measureText(m).width)) : 0
    ctx.font = '10px system-ui, sans-serif'
    return Math.max(nameW, modelW) + 8
  })
}

export function drawSideBySide(
  ctx: CanvasRenderingContext2D,
  W: number, _H: number, pad: number,
  sensors: ResolvedSensor[],
  alphaMap?: Map<string, number>,
): number {
  const isMobile = W < 600
  const useRows = isMobile || sensors.length > 5
  const gap = 16

  if (!useRows) {
    const maxModels = Math.max(...sensors.map(s => (POPULAR_MODELS[s.id] ?? []).length), 0)
    const labelSpace = 36 + maxModels * 12
    const maxH = Math.max(...sensors.map(s => s.h))
    const minTextWidths = computeMinTextWidths(ctx, sensors)
    const totalGap = (sensors.length - 1) * gap
    const availW = W - pad * 2 - totalGap
    const targetH = 400

    let lo = 0, hi = 50
    for (let iter = 0; iter < 30; iter++) {
      const mid = (lo + hi) / 2
      const totalNeeded = sensors.reduce((sum, s, i) => sum + Math.max(s.w * mid, minTextWidths[i]), 0)
      if (totalNeeded <= availW && maxH * mid <= targetH) lo = mid
      else hi = mid
    }
    const scale = lo
    const tallestH = maxH * scale
    const baseY = pad + tallestH

    drawSideBySideRow(ctx, W, pad, sensors, scale, baseY, alphaMap)
    return baseY + labelSpace + pad
  } else {
    const perRow = isMobile ? 2 : Math.ceil(sensors.length / 2)
    const rows: ResolvedSensor[][] = []
    for (let i = 0; i < sensors.length; i += perRow) {
      rows.push(sensors.slice(i, i + perRow))
    }

    const rowGap = 20
    const maxH = Math.max(...sensors.map(s => s.h))
    const minTextWidths = computeMinTextWidths(ctx, sensors)
    // `sensors.indexOf(s)` inside the binary search below was an O(30 · n²)
    // scan (30 bisection iterations × every row × an indexOf over all
    // sensors). Precompute an id → index map once instead.
    const idToIndex = new Map(sensors.map((s, i) => [s.id, i]))
    const maxRowLen = Math.max(...rows.map(r => r.length))
    const totalGap = (maxRowLen - 1) * gap
    const availW = W - pad * 2 - totalGap

    const targetRowH = 250
    let lo = 0, hi = targetRowH / maxH
    for (let iter = 0; iter < 30; iter++) {
      const midScale = (lo + hi) / 2
      let fits = true
      for (const row of rows) {
        const rowNeeded = row.reduce((sum, s) => {
          const tw = minTextWidths[idToIndex.get(s.id)!]
          return sum + Math.max(s.w * midScale, tw)
        }, 0)
        if (rowNeeded > availW) { fits = false; break }
      }
      if (fits) lo = midScale
      else hi = midScale
    }
    const scale = lo

    const rowHeights = rows.map(row => {
      const rowMaxH = Math.max(...row.map(s => s.h)) * scale
      const rowMaxModels = Math.max(...row.map(s => (POPULAR_MODELS[s.id] ?? []).length), 0)
      const rowLabelSpace = 36 + rowMaxModels * 12
      return { sensorH: rowMaxH, labelSpace: rowLabelSpace, total: rowMaxH + rowLabelSpace }
    })
    const startY = pad

    let curY = startY
    for (let ri = 0; ri < rows.length; ri++) {
      const baseY = curY + rowHeights[ri].sensorH
      drawSideBySideRow(ctx, W, pad, rows[ri], scale, baseY, alphaMap)
      curY += rowHeights[ri].total + rowGap
    }

    ctx.textBaseline = 'alphabetic'
    return curY - rowGap + pad
  }
}

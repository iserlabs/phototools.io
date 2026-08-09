import type { ResolvedSensor, SensorRect } from './sensorSizeTypes'
import { rgba, roundRect } from './sensorSizeHelpers'

export let overlayRects: SensorRect[] = []

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  W: number, _H: number, pad: number,
  sensors: ResolvedSensor[],
  alphaMap?: Map<string, number>,
  hoveredId?: string | null,
): number {
  const maxW = Math.max(...sensors.map((s) => s.w))
  const maxH = Math.max(...sensors.map((s) => s.h))
  const isMobile = W < 600

  const labelColumnW = isMobile ? 0 : 160
  const pillH = 18
  const labelGap = 4
  const sorted = [...sensors].sort((a, b) => b.w * b.h - a.w * a.h)

  const availW = W - pad * 2 - labelColumnW
  const totalLabelH = sorted.length * pillH + (sorted.length - 1) * labelGap

  const targetSensorH = 400
  const availH = isMobile ? Math.min(W * 0.8, 300) : Math.max(targetSensorH, totalLabelH)

  const scale = Math.min(availW / maxW, availH / maxH)
  const rectsH = maxH * scale
  const cx = pad + labelColumnW + availW / 2
  const cy = pad + Math.max(rectsH, totalLabelH) / 2

  overlayRects = []
  for (const s of sorted) {
    const a = alphaMap?.get(s.id) ?? 1
    const rw = s.w * scale
    const rh = s.h * scale
    const x = cx - rw / 2
    const y = cy - rh / 2
    const r = Math.min(4, rw * 0.02)

    overlayRects.push({ id: s.id, x, y, w: rw, h: rh, sensorW: s.w, sensorH: s.h, color: s.color })

    ctx.save()
    ctx.globalAlpha = a
    roundRect(ctx, x, y, rw, rh, r)
    ctx.fillStyle = rgba(s.color, 0.08)
    ctx.fill()
    roundRect(ctx, x, y, rw, rh, r)
    ctx.strokeStyle = rgba(s.color, 0.7)
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.restore()
  }

  const MIN_DIM_W = 70
  const MIN_DIM_H = 30
  ctx.font = '9px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'

  for (const s of sorted) {
    const a = alphaMap?.get(s.id) ?? 1
    const rw = s.w * scale
    const rh = s.h * scale

    if (rw >= MIN_DIM_W && rh >= MIN_DIM_H) {
      const x = cx - rw / 2
      const y = cy - rh / 2
      ctx.save()
      ctx.globalAlpha = a * 0.5
      ctx.fillStyle = s.color
      ctx.fillText(`${s.w}×${s.h} mm`, x + rw / 2, y + rh - 4)
      ctx.restore()
    }
  }

  if (hoveredId) {
    const hRect = overlayRects.find(r => r.id === hoveredId)
    if (hRect && (hRect.w < MIN_DIM_W || hRect.h < MIN_DIM_H)) {
      const label = `${hRect.sensorW}×${hRect.sensorH} mm`
      ctx.font = '10px system-ui, sans-serif'
      const tw = ctx.measureText(label).width + 10
      const th = 20
      const tx = hRect.x + hRect.w / 2 - tw / 2
      const ty = hRect.y - th - 4

      ctx.save()
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      roundRect(ctx, tx, ty, tw, th, 4)
      ctx.fill()
      ctx.fillStyle = hRect.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, tx + tw / 2, ty + th / 2)
      ctx.restore()
    }
  }

  ctx.font = '11px system-ui, sans-serif'
  const pillWidths = sorted.map(s => ctx.measureText(s.name).width + 10)

  if (isMobile) {
    return drawOverlayMobileLabels(ctx, sorted, alphaMap, cx, cy, scale, pillWidths, pillH, labelGap, pad)
  } else {
    return drawOverlayDesktopLabels(ctx, sorted, alphaMap, cx, cy, scale, rectsH, totalLabelH, pillWidths, pillH, labelGap, pad)
  }
}

function drawOverlayMobileLabels(
  ctx: CanvasRenderingContext2D,
  sorted: ResolvedSensor[],
  alphaMap: Map<string, number> | undefined,
  cx: number, cy: number, scale: number,
  pillWidths: number[], pillH: number, labelGap: number, pad: number,
): number {
  const largest = sorted[0]
  const lh = largest.h * scale
  let labelY = cy + lh / 2 + 16

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]
    const a = alphaMap?.get(s.id) ?? 1
    const pillW = pillWidths[i]
    const pillX = cx - pillW / 2

    ctx.save()
    ctx.globalAlpha = a
    roundRect(ctx, pillX, labelY, pillW, pillH, 3)
    ctx.fillStyle = rgba(s.color, 0.15)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(pillX - 8, labelY + pillH / 2, 3, 0, Math.PI * 2)
    ctx.fillStyle = s.color
    ctx.fill()
    ctx.fillStyle = s.color
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(s.name, pillX + 5, labelY + pillH / 2)
    ctx.restore()
    labelY += pillH + labelGap
  }
  return labelY + pad
}

function drawOverlayDesktopLabels(
  ctx: CanvasRenderingContext2D,
  sorted: ResolvedSensor[],
  alphaMap: Map<string, number> | undefined,
  cx: number, cy: number, scale: number,
  rectsH: number, totalLabelH: number,
  pillWidths: number[], pillH: number, labelGap: number, pad: number,
): number {
  let labelY = cy - totalLabelH / 2
  const largestRectLeft = cx - sorted[0].w * scale / 2
  const columnRight = largestRectLeft - 20

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]
    const a = alphaMap?.get(s.id) ?? 1
    const rw = s.w * scale
    const rectLeft = cx - rw / 2
    const label = s.name
    const pillW = pillWidths[i]
    const pillX = columnRight - pillW
    const pillCenterY = labelY + pillH / 2

    ctx.save()
    ctx.globalAlpha = a

    ctx.beginPath()
    ctx.moveTo(columnRight + 4, pillCenterY)
    ctx.lineTo(rectLeft, pillCenterY)
    ctx.strokeStyle = rgba(s.color, 0.25)
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.stroke()
    ctx.setLineDash([])

    ctx.beginPath()
    ctx.arc(rectLeft, pillCenterY, 2, 0, Math.PI * 2)
    ctx.fillStyle = rgba(s.color, 0.5)
    ctx.fill()

    roundRect(ctx, pillX, labelY, pillW, pillH, 3)
    ctx.fillStyle = rgba(s.color, 0.15)
    ctx.fill()

    ctx.fillStyle = s.color
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, pillX + 5, pillCenterY)

    ctx.restore()
    labelY += pillH + labelGap
  }
  return cy + Math.max(rectsH, totalLabelH) / 2 + pad
}

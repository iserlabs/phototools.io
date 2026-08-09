import type { ResolvedSensor, SensorRect } from './sensorSizeTypes'
import type { CanvasPalette } from './canvasPalette'
import { rgba, roundRect, hoverDim } from './sensorSizeHelpers'
import { drawOverlayMobileLabels, drawOverlayDesktopLabels } from './drawOverlayLabels'
import { drawHoverTooltip } from './drawOverlayTooltip'

export let overlayRects: SensorRect[] = []

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  W: number, _H: number, pad: number,
  sensors: ResolvedSensor[],
  alphaMap?: Map<string, number>,
  hoveredId?: string | null,
  palette?: CanvasPalette,
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
    const isHovered = s.id === hoveredId
    const dim = hoverDim(hoveredId, s.id)
    const rw = s.w * scale
    const rh = s.h * scale
    const x = cx - rw / 2
    const y = cy - rh / 2
    const r = Math.min(4, rw * 0.02)

    overlayRects.push({ id: s.id, x, y, w: rw, h: rh, sensorW: s.w, sensorH: s.h, color: s.color })

    ctx.save()
    ctx.globalAlpha = a * dim
    roundRect(ctx, x, y, rw, rh, r)
    ctx.fillStyle = rgba(s.color, isHovered ? 0.16 : 0.08)
    ctx.fill()
    roundRect(ctx, x, y, rw, rh, r)
    ctx.strokeStyle = rgba(s.color, 0.7)
    ctx.lineWidth = isHovered ? 2.5 : 1.5
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
    const dim = hoverDim(hoveredId, s.id)
    const rw = s.w * scale
    const rh = s.h * scale

    if (rw >= MIN_DIM_W && rh >= MIN_DIM_H) {
      const x = cx - rw / 2
      const y = cy - rh / 2
      ctx.save()
      ctx.globalAlpha = a * dim * 0.5
      ctx.fillStyle = s.color
      ctx.fillText(`${s.w}×${s.h} mm`, x + rw / 2, y + rh - 4)
      ctx.restore()
    }
  }

  ctx.font = '11px system-ui, sans-serif'
  const pillWidths = sorted.map(s => ctx.measureText(s.name).width + 10)

  const contentH = isMobile
    ? drawOverlayMobileLabels(ctx, sorted, alphaMap, hoveredId, cx, cy, scale, pillWidths, pillH, labelGap, pad)
    : drawOverlayDesktopLabels(ctx, sorted, alphaMap, hoveredId, cx, cy, scale, rectsH, totalLabelH, pillWidths, pillH, labelGap, pad)

  if (hoveredId && palette) {
    const hSensor = sorted.find((s) => s.id === hoveredId)
    const hRect = overlayRects.find((r) => r.id === hoveredId)
    if (hSensor && hRect) {
      const hoveredAlpha = alphaMap?.get(hoveredId) ?? 1
      drawHoverTooltip(ctx, hSensor, hRect, palette, W, pad, hoveredAlpha)
    }
  }

  return contentH
}

import type { ResolvedSensor } from './sensorSizeTypes'
import { rgba, roundRect, hoverDim } from './sensorSizeHelpers'

export function drawOverlayMobileLabels(
  ctx: CanvasRenderingContext2D,
  sorted: ResolvedSensor[],
  alphaMap: Map<string, number> | undefined,
  hoveredId: string | null | undefined,
  cx: number, cy: number, scale: number,
  pillWidths: number[], pillH: number, labelGap: number, pad: number,
): number {
  const largest = sorted[0]
  const lh = largest.h * scale
  let labelY = cy + lh / 2 + 16

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]
    const a = alphaMap?.get(s.id) ?? 1
    const dim = hoverDim(hoveredId, s.id)
    const pillW = pillWidths[i]
    const pillX = cx - pillW / 2

    ctx.save()
    ctx.globalAlpha = a * dim
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

export function drawOverlayDesktopLabels(
  ctx: CanvasRenderingContext2D,
  sorted: ResolvedSensor[],
  alphaMap: Map<string, number> | undefined,
  hoveredId: string | null | undefined,
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
    const dim = hoverDim(hoveredId, s.id)
    const rw = s.w * scale
    const rectLeft = cx - rw / 2
    const label = s.name
    const pillW = pillWidths[i]
    const pillX = columnRight - pillW
    const pillCenterY = labelY + pillH / 2

    ctx.save()
    ctx.globalAlpha = a * dim

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

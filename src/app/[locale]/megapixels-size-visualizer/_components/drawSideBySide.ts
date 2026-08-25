import type { MegapixelPreset, UnitSystem, AspectRatio } from '@/lib/types'
import { mpToPixelDimensions } from '@/lib/math/resolution'
import { printSizeMm } from '@/lib/math/megapixel'
import { drawRect, drawLabel } from './drawHelpers'

export function drawSideBySide(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  padding: number,
  visibleMps: MegapixelPreset[],
  aspectFor: (m: MegapixelPreset) => AspectRatio,
  dpi: number,
  _units: UnitSystem,
): { contentHeight: number; pxPerMm: number } {
  if (visibleMps.length === 0) {
    return { contentHeight: 300, pxPerMm: 0 }
  }

  // Compute print sizes
  const sized = visibleMps
    .map(m => {
      const { pxW, pxH } = mpToPixelDimensions(m.mp, aspectFor(m))
      const { wMm, hMm } = printSizeMm(pxW, pxH, dpi)
      return { mp: m, wMm, hMm }
    })
    .sort((a, b) => b.wMm * b.hMm - (a.wMm * a.hMm))

  const gap = 24
  const labelH = 30
  const scaleBarReserve = 40
  const totalMmW = sized.reduce((acc, s) => acc + s.wMm, 0)
  const availW = Math.max(0, canvasWidth - padding * 2 - gap * (sized.length - 1))
  const maxHMm = Math.max(...sized.map(s => s.hMm))
  const availH = Math.max(0, canvasHeight - padding * 2 - labelH - scaleBarReserve)

  if (availW <= 0 || availH <= 0) {
    return { contentHeight: 300, pxPerMm: 0 }
  }

  const pxPerMm = Math.min(availW / totalMmW, availH / maxHMm)
  if (pxPerMm <= 0) {
    return { contentHeight: 300, pxPerMm: 0 }
  }
  const totalRectsW = totalMmW * pxPerMm + gap * (sized.length - 1)
  const maxRectsH = maxHMm * pxPerMm

  // Horizontally center the row of rectangles, vertically center within available area
  let x = (canvasWidth - totalRectsW) / 2
  const cy = padding + (canvasHeight - padding * 2 - scaleBarReserve - labelH) / 2
  const baseY = cy + maxRectsH / 2

  for (const { mp, wMm, hMm } of sized) {
    const w = wMm * pxPerMm
    const h = hMm * pxPerMm
    const y = baseY - h
    drawRect(ctx, x, y, w, h, mp.color, 1)
    drawLabel(ctx, mp.name, x + w / 2, baseY + 8, mp.color, 1)
    x += w + gap
  }

  const contentHeight = Math.max(400, baseY + labelH + padding + scaleBarReserve)
  return { contentHeight, pxPerMm }
}

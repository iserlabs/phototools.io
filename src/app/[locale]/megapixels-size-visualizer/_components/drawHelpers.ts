import { roundRectPath } from '@/lib/utils/round-rect'

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff},${a})`
}

export function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  alpha: number,
) {
  // Skip entirely if the rect has no area (no zero-area paths).
  if (w <= 0 || h <= 0) return
  const r = Math.min(4, w * 0.02)
  ctx.save()
  ctx.globalAlpha = alpha
  roundRectPath(ctx, x, y, w, h, r)
  ctx.fillStyle = rgba(color, 0.08)
  ctx.fill()
  roundRectPath(ctx, x, y, w, h, r)
  ctx.strokeStyle = rgba(color, 0.75)
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  alpha: number,
) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.font = 'bold 11px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(text, x, y)
  ctx.restore()
}

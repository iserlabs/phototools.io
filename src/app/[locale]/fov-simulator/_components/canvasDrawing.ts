import type { Rect } from './canvasTypes'
import { roundRectPath } from '@/lib/utils/round-rect'
import { FRAMING_GUIDES, MIN_HIT_SIZE } from './canvasTypes'

export function drawFramingGuides(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  verticalFrameHeight: number,
  dpr: number,
) {
  const tickLen = 18 * dpr
  const lineX = rect.x + tickLen + 4 * dpr
  const fontSize = 10 * dpr
  ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`
  ctx.setLineDash([3 * dpr, 3 * dpr])
  ctx.lineWidth = 1.5 * dpr

  const connectorLines: Array<{ x: number; topY: number; botY: number }> = []

  for (const guide of FRAMING_GUIDES) {
    const fraction = guide.height / verticalFrameHeight
    if (fraction > 1 || fraction < 0.05) continue

    const guideY = rect.y + rect.h * (1 - fraction)

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.beginPath()
    ctx.moveTo(rect.x + 2 * dpr, guideY)
    ctx.lineTo(rect.x + tickLen, guideY)
    ctx.stroke()

    const botY = rect.y + rect.h
    ctx.beginPath()
    ctx.moveTo(rect.x + 2 * dpr, botY)
    ctx.lineTo(rect.x + tickLen, botY)
    ctx.stroke()

    connectorLines.push({ x: lineX, topY: guideY, botY })

    const labelText = guide.label
    const metrics = ctx.measureText(labelText)
    const labelW = metrics.width + 6 * dpr
    const labelH = fontSize + 4 * dpr
    const labelX = rect.x + tickLen + 6 * dpr
    const labelY = guideY - 1 * dpr

    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    roundRectPath(ctx, labelX, labelY - labelH + 2 * dpr, labelW, labelH, 3 * dpr)
    ctx.fill()

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fillText(labelText, labelX + 3 * dpr, labelY)

    ctx.setLineDash([3 * dpr, 3 * dpr])
  }

  for (const { x, topY, botY } of connectorLines) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.beginPath()
    ctx.moveTo(x, topY)
    ctx.lineTo(x, botY)
    ctx.stroke()
  }

  ctx.setLineDash([])
}

export function hitTestRect(r: Rect, cx: number, cy: number): boolean {
  const dpr = window.devicePixelRatio || 1
  const hitW = Math.max(r.w, MIN_HIT_SIZE * dpr)
  const hitH = Math.max(r.h, MIN_HIT_SIZE * dpr)
  const hitX = r.x + r.w / 2 - hitW / 2
  const hitY = r.y + r.h / 2 - hitH / 2
  if (cx >= hitX && cx <= hitX + hitW && cy >= hitY && cy <= hitY + hitH) return true

  if (r.pill) {
    const p = r.pill
    if (cx >= p.x && cx <= p.x + p.w && cy >= p.y && cy <= p.y + p.h) return true
  }

  return false
}

export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
) {
  const imgAspect = img.width / img.height
  const destAspect = dw / dh
  let sx: number, sy: number, sw: number, sh: number
  if (imgAspect > destAspect) {
    sh = img.height
    sw = sh * destAspect
    sx = (img.width - sw) / 2
    sy = 0
  } else {
    sw = img.width
    sh = sw / destAspect
    sx = 0
    sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}

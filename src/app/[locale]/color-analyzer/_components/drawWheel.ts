import { hslToRgb } from '@/lib/math/color'
import { rgbToHex } from '@/lib/math/color-fit'

export function hueToPos(hue: number, sat: number, cx: number, cy: number, radius: number) {
  const angleRad = (hue - 90) * (Math.PI / 180)
  const dist = (sat / 100) * radius
  return { x: cx + dist * Math.cos(angleRad), y: cy + dist * Math.sin(angleRad) }
}

export function drawWheelPixels(
  ctx: CanvasRenderingContext2D,
  canvasPixels: number,
  lightness: number,
  cache: { imageData: ImageData; lightness: number; size: number } | null,
): ImageData {
  if (cache && cache.lightness === lightness && cache.size === canvasPixels) {
    ctx.putImageData(cache.imageData, 0, 0)
    return cache.imageData
  }

  const imageData = ctx.createImageData(canvasPixels, canvasPixels)
  const data = imageData.data
  const cx = canvasPixels / 2
  const cy = canvasPixels / 2
  const r = cx
  const r2 = r * r
  const invR = 1 / r
  const RAD_TO_DEG = 180 / Math.PI

  const ln = lightness / 100
  const k = 1 - Math.abs(2 * ln - 1)

  for (let y = 0; y < canvasPixels; y++) {
    const dy = y - cy
    const dy2 = dy * dy
    const rowOffset = y * canvasPixels

    for (let x = 0; x < canvasPixels; x++) {
      const dx = x - cx
      const dist2 = dx * dx + dy2
      if (dist2 > r2) continue

      const dist = Math.sqrt(dist2)
      let angle = Math.atan2(dx, -dy) * RAD_TO_DEG
      if (angle < 0) angle += 360

      const sn = dist * invR
      const c = k * sn
      const hSector = angle / 60
      const xc = c * (1 - Math.abs((hSector % 2) - 1))
      const m = ln - c / 2

      let r1: number, g1: number, b1: number
      if (hSector < 1) { r1 = c; g1 = xc; b1 = 0 }
      else if (hSector < 2) { r1 = xc; g1 = c; b1 = 0 }
      else if (hSector < 3) { r1 = 0; g1 = c; b1 = xc }
      else if (hSector < 4) { r1 = 0; g1 = xc; b1 = c }
      else if (hSector < 5) { r1 = xc; g1 = 0; b1 = c }
      else { r1 = c; g1 = 0; b1 = xc }

      const idx = (rowOffset + x) * 4
      data[idx]     = ((r1 + m) * 255 + 0.5) | 0
      data[idx + 1] = ((g1 + m) * 255 + 0.5) | 0
      data[idx + 2] = ((b1 + m) * 255 + 0.5) | 0
      data[idx + 3] = 255
    }
  }
  ctx.putImageData(imageData, 0, 0)
  return imageData
}

export interface WheelDot { id: string; hue: number; r: number; hex: string; index: number; isKey: boolean; neutral: boolean }
export interface WheelTarget { id: string; hue: number; r: number; filled: boolean }
export interface WheelArrow { fromId: string; toHue: number; toR: number }

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2)
}

function drawNumberedDot(ctx: CanvasRenderingContext2D, x: number, y: number, dot: WheelDot, selected: boolean, dpr: number) {
  const radius = (dot.isKey ? 12 : 10) * dpr
  circle(ctx, x, y, radius)
  ctx.fillStyle = dot.hex; ctx.fill()
  ctx.lineWidth = (selected ? 3 : 2) * dpr
  ctx.strokeStyle = selected ? '#ffd166' : '#ffffff'; ctx.stroke()
  if (dot.isKey) {
    circle(ctx, x, y, radius + 4 * dpr)
    ctx.lineWidth = 1.5 * dpr; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.stroke()
  }
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${10 * dpr}px system-ui, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3 * dpr
  ctx.strokeText(String(dot.index), x, y)
  ctx.fillText(String(dot.index), x, y)
}

function drawArrow(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, dpr: number) {
  const angle = Math.atan2(y1 - y0, x1 - x0)
  const head = 8 * dpr
  const shorten = 12 * dpr   // stop before the target circle
  const ex = x1 - Math.cos(angle) * shorten
  const ey = y1 - Math.sin(angle) * shorten
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex, ey)
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5 * dpr; ctx.setLineDash([]); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(ex, ey)
  ctx.lineTo(ex - head * Math.cos(angle - Math.PI / 6), ey - head * Math.sin(angle - Math.PI / 6))
  ctx.lineTo(ex - head * Math.cos(angle + Math.PI / 6), ey - head * Math.sin(angle + Math.PI / 6))
  ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill()
}

/**
 * Draws targets (dashed), arrows (dot → target), numbered sample dots, and the
 * key dot (no-sample mode). Call after drawWheelPixels on the same context.
 */
export function drawAnalyzerOverlay(
  ctx: CanvasRenderingContext2D,
  canvasPixels: number,
  dpr: number,
  o: { dots: WheelDot[]; targets: WheelTarget[]; arrows: WheelArrow[]; keyDot: WheelDot | null; selectedId: string | null; lightness: number },
) {
  const cx = canvasPixels / 2, cy = canvasPixels / 2, R = cx
  const dotById = new Map(o.dots.map((d) => [d.id, d]))

  // spokes + dashed targets
  for (const t of o.targets) {
    const pos = hueToPos(t.hue, t.r, cx, cy, R)
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1 * dpr; ctx.setLineDash([]); ctx.stroke()
    circle(ctx, pos.x, pos.y, 10 * dpr)
    if (!t.filled) {
      const rgb = hslToRgb(t.hue, t.r, o.lightness)
      ctx.fillStyle = rgbToHex(rgb.r, rgb.g, rgb.b) + '99'; ctx.fill()
    }
    ctx.setLineDash([4 * dpr, 3 * dpr]); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5 * dpr; ctx.stroke()
    ctx.setLineDash([])
  }

  for (const a of o.arrows) {
    const from = dotById.get(a.fromId)
    if (!from) continue
    const p0 = hueToPos(from.hue, from.r, cx, cy, R)
    const p1 = hueToPos(a.toHue, a.toR, cx, cy, R)
    drawArrow(ctx, p0.x, p0.y, p1.x, p1.y, dpr)
  }

  for (const d of o.dots) {
    const pos = d.neutral ? { x: cx, y: cy } : hueToPos(d.hue, d.r, cx, cy, R)
    drawNumberedDot(ctx, pos.x, pos.y, d, d.id === o.selectedId, dpr)
  }

  if (o.keyDot) {
    const pos = hueToPos(o.keyDot.hue, o.keyDot.r, cx, cy, R)
    drawNumberedDot(ctx, pos.x, pos.y, o.keyDot, false, dpr)
  }
}

import { hslToRgb } from '@/lib/math/color'

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')
}

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

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, hex: string, isBase: boolean, dpr: number) {
  const dotRadius = (isBase ? 11 : 8) * dpr

  ctx.beginPath()
  ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
  ctx.fillStyle = hex
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.5 * dpr
  ctx.stroke()

  if (isBase) {
    ctx.beginPath()
    ctx.arc(x, y, dotRadius + 4 * dpr, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 1.5 * dpr
    ctx.stroke()
  }
}

interface MonoPoint {
  h: number
  s: number
  l: number
}

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  canvasPixels: number,
  harmonyHues: number[],
  saturation: number,
  lightness: number,
  dpr: number,
  baseIndex: number,
  monochromaticPoints: MonoPoint[] | undefined,
) {
  const cx = canvasPixels / 2
  const cy = canvasPixels / 2
  const r = cx

  if (monochromaticPoints && monochromaticPoints.length > 0) {
    const monoPoints = monochromaticPoints.map((p) => {
      const pos = hueToPos(p.h, p.s, cx, cy, r)
      return { ...pos, ...p }
    })

    const outermost = monoPoints.reduce((a, b) =>
      Math.hypot(a.x - cx, a.y - cy) > Math.hypot(b.x - cx, b.y - cy) ? a : b
    )
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(outermost.x, outermost.y)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.lineWidth = 1.5 * dpr
    ctx.stroke()

    monoPoints.forEach((p, i) => {
      const rgb = hslToRgb(p.h, p.s, p.l)
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
      drawDot(ctx, p.x, p.y, hex, i === baseIndex, dpr)
    })
    return
  }

  const points = harmonyHues.map((h) => {
    const pos = hueToPos(h, saturation, cx, cy, r)
    return { ...pos, hue: h }
  })

  points.forEach((p) => {
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.lineWidth = 1.5 * dpr
    ctx.stroke()
  })

  points.forEach((p, i) => {
    const rgb = hslToRgb(p.hue, saturation, lightness)
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
    drawDot(ctx, p.x, p.y, hex, i === baseIndex, dpr)
  })
}

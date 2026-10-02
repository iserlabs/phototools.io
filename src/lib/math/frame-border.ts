import type { GradientDirection } from '@/app/[locale]/frame-studio/_components/types'
import { roundRectPath } from '@/lib/utils/round-rect'

export function computeExportDimensions(
  imageW: number,
  imageH: number,
  borderWidth: number,
  innerMatWidth: number,
): { width: number; height: number } {
  const total = borderWidth + innerMatWidth
  return {
    width: imageW + total * 2,
    height: imageH + total * 2,
  }
}

export function drawSolidBorder(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  color: string,
  cornerRadius: number,
): void {
  ctx.fillStyle = color
  if (cornerRadius > 0) {
    roundRectPath(ctx, 0, 0, canvasW, canvasH, cornerRadius)
    ctx.fill()
  } else {
    ctx.fillRect(0, 0, canvasW, canvasH)
  }
}

export function drawGradientBorder(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  color1: string,
  color2: string,
  direction: GradientDirection,
  cornerRadius: number,
): void {
  let gradient: CanvasGradient

  if (direction === 'radial') {
    const cx = canvasW / 2
    const cy = canvasH / 2
    const r = Math.max(canvasW, canvasH) / 2
    gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  } else {
    const coords = gradientCoords(canvasW, canvasH, direction)
    gradient = ctx.createLinearGradient(...coords)
  }

  gradient.addColorStop(0, color1)
  gradient.addColorStop(1, color2)
  ctx.fillStyle = gradient

  if (cornerRadius > 0) {
    roundRectPath(ctx, 0, 0, canvasW, canvasH, cornerRadius)
    ctx.fill()
  } else {
    ctx.fillRect(0, 0, canvasW, canvasH)
  }
}

function gradientCoords(
  w: number,
  h: number,
  dir: Exclude<GradientDirection, 'radial'>,
): [number, number, number, number] {
  switch (dir) {
    case 'top': return [0, h, 0, 0]
    case 'bottom': return [0, 0, 0, h]
    case 'left': return [w, 0, 0, 0]
    case 'right': return [0, 0, w, 0]
    case 'diagonal-tl': return [w, h, 0, 0]
    case 'diagonal-tr': return [0, h, w, 0]
  }
}

export function drawInnerMat(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  borderWidth: number,
  cornerRadius: number,
  _matWidth: number,
  matColor: string,
): void {
  ctx.fillStyle = matColor
  const x = borderWidth
  const y = borderWidth
  const w = canvasW - borderWidth * 2
  const h = canvasH - borderWidth * 2

  if (cornerRadius > 0) {
    roundRectPath(ctx, x, y, w, h, Math.max(0, cornerRadius - borderWidth / 2))
    ctx.fill()
  } else {
    ctx.fillRect(x, y, w, h)
  }
}

export function drawShadow(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  _borderWidth: number,
  cornerRadius: number,
  options: ShadowOptions,
): void {
  ctx.save()
  ctx.shadowColor = options.color
  ctx.shadowBlur = options.blur
  ctx.shadowOffsetX = options.offsetX
  ctx.shadowOffsetY = options.offsetY
  ctx.fillStyle = 'rgba(0,0,0,0)'
  if (cornerRadius > 0) {
    roundRectPath(ctx, 0, 0, canvasW, canvasH, cornerRadius)
    ctx.fill()
  } else {
    ctx.fillRect(0, 0, canvasW, canvasH)
  }
  ctx.restore()
}

export interface ShadowOptions {
  color: string
  blur: number
  offsetX: number
  offsetY: number
}

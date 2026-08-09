import type { ResolvedSensor } from './sensorSizeTypes'
import { pixelPitch } from '@/lib/math/diffraction'
import { rgba, roundRect } from './sensorSizeHelpers'

export function drawPixelGrid(
  ctx: CanvasRenderingContext2D,
  s: ResolvedSensor,
  sensorScale: number,
  mp: number,
  rx: number, ry: number,
  sensorPxW: number, sensorPxH: number,
) {
  const pitch = pixelPitch(s.w, mp, s.h)
  const cellSize = Math.max(pitch * sensorScale * 0.25, 1.5)
  const gridCols = Math.max(1, Math.floor(sensorPxW / cellSize))
  const gridRows = Math.max(1, Math.floor(sensorPxH / cellSize))
  const actualGridW = gridCols * cellSize
  const actualGridH = gridRows * cellSize
  const gridOffX = rx + (sensorPxW - actualGridW) / 2
  const gridOffY = ry + (sensorPxH - actualGridH) / 2

  roundRect(ctx, rx, ry, sensorPxW, sensorPxH, 3)
  ctx.fillStyle = rgba(s.color, 0.06)
  ctx.fill()

  const maxCells = 2000
  if (gridCols * gridRows <= maxCells) {
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const cx = gridOffX + c * cellSize
        const cy = gridOffY + r * cellSize
        ctx.fillStyle = rgba(s.color, 0.12)
        ctx.fillRect(cx, cy, cellSize, cellSize)
        ctx.strokeStyle = rgba(s.color, 0.25)
        ctx.lineWidth = 0.3
        ctx.strokeRect(cx, cy, cellSize, cellSize)
      }
    }
  } else {
    ctx.fillStyle = rgba(s.color, 0.12)
    ctx.fillRect(gridOffX, gridOffY, actualGridW, actualGridH)
    ctx.strokeStyle = rgba(s.color, 0.2)
    ctx.lineWidth = 0.5
    const step = Math.max(actualGridW / 20, 3)
    for (let lx = gridOffX; lx <= gridOffX + actualGridW; lx += step) {
      ctx.beginPath(); ctx.moveTo(lx, gridOffY); ctx.lineTo(lx, gridOffY + actualGridH); ctx.stroke()
    }
    for (let ly = gridOffY; ly <= gridOffY + actualGridH; ly += step) {
      ctx.beginPath(); ctx.moveTo(gridOffX, ly); ctx.lineTo(gridOffX + actualGridW, ly); ctx.stroke()
    }
  }

  roundRect(ctx, rx, ry, sensorPxW, sensorPxH, 3)
  ctx.strokeStyle = rgba(s.color, 0.6)
  ctx.lineWidth = 1.5
  ctx.stroke()
}

export function drawEntryLabel(
  ctx: CanvasRenderingContext2D,
  color: string, mp: number, pitch: number, models: string,
  centerX: number, baseY: number,
): number {
  ctx.fillStyle = color
  ctx.font = '10px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(`${mp} MP · ${pitch.toFixed(2)} µm`, centerX, baseY + 4)

  let modelLines = 0
  if (models) {
    const parts = models.split(' / ')
    ctx.fillStyle = rgba(color, 0.5)
    ctx.font = '9px system-ui, sans-serif'
    for (let mi = 0; mi < parts.length; mi++) {
      ctx.fillText(parts[mi].trim(), centerX, baseY + 18 + mi * 12)
    }
    modelLines = parts.length
  }
  return modelLines
}

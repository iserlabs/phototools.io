import type { ResolvedSensor, SensorRect } from './sensorSizeTypes'
import type { CanvasPalette } from './canvasPalette'
import { calcCropFactor } from '@/lib/data/sensors'
import { roundRect } from './sensorSizeHelpers'

/**
 * Pill tooltip near the hovered rect's top edge, shown for every hovered
 * sensor (not just ones too small for the in-rect `w×h` label). Background
 * comes from the themed palette; text uses the sensor's own color, matching
 * the rest of the overlay's per-sensor color coding. Clamped horizontally
 * inside the canvas, and flips below the rect if there isn't room above.
 */
export function drawHoverTooltip(
  ctx: CanvasRenderingContext2D,
  hSensor: ResolvedSensor,
  hRect: SensorRect,
  palette: CanvasPalette,
  W: number, pad: number,
  alpha: number,
) {
  const crop = calcCropFactor(hSensor.w, hSensor.h)
  const label = `${hSensor.name} · ${hSensor.w}×${hSensor.h} mm · ${crop.toFixed(2)}x`

  ctx.font = '11px system-ui, sans-serif'
  const tw = ctx.measureText(label).width + 16
  const th = 22

  let tx = hRect.x + hRect.w / 2 - tw / 2
  tx = Math.max(pad, Math.min(tx, W - pad - tw))
  let ty = hRect.y - th - 6
  if (ty < pad) ty = hRect.y + hRect.h + 6

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = palette.tooltipBg
  roundRect(ctx, tx, ty, tw, th, 5)
  ctx.fill()
  ctx.fillStyle = hSensor.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, tx + tw / 2, ty + th / 2)
  ctx.restore()
}

import type { ResolvedSensor, SensorRect } from './sensorSizeTypes'
import type { CanvasPalette } from './canvasPalette'
import { calcCropFactor } from '@/lib/data/sensors'
import { roundRect } from './sensorSizeHelpers'

/**
 * Pill tooltip near the hovered rect's top edge, shown for every hovered
 * sensor (not just ones too small for the in-rect `w×h` label). Background
 * comes from the themed palette; text uses `palette.tooltipFg` so it always
 * contrasts with the background in both themes (many palette colors — e.g.
 * `#fda4af`, `#f59e0b`, `#38bdf8` — fall below ~2.5:1 against a white
 * `--bg-surface` in light theme). The sensor's own color still shows up as a
 * small identity dot to the left of the label, matching the rest of the
 * overlay's per-sensor color coding without sacrificing text legibility.
 * Clamped horizontally inside the canvas, and flips below the rect if there
 * isn't room above.
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
  const textW = ctx.measureText(label).width
  const sidePad = 8
  const dotR = 3
  const dotGap = 6
  const tw = sidePad + dotR * 2 + dotGap + textW + sidePad
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

  const dotCx = tx + sidePad + dotR
  const dotCy = ty + th / 2
  ctx.beginPath()
  ctx.arc(dotCx, dotCy, dotR, 0, Math.PI * 2)
  ctx.fillStyle = hSensor.color
  ctx.fill()

  ctx.fillStyle = palette.tooltipFg
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, dotCx + dotR + dotGap, dotCy)
  ctx.restore()
}

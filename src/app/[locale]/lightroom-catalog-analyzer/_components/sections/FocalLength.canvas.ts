import type { FocalLengthBlock } from '@/lib/lrcat/types'

export interface DrawFocalLengthOpts {
  width: number
  height: number
  /** Optional CSS color for bars; falls back to default. */
  barColor?: string
  /** Optional axis/text color. */
  axisColor?: string
  /** Optional minimum/maximum mm to display; defaults to data range. */
  minMm?: number
  maxMm?: number
}

/**
 * Draw the focal-length histogram. Pure: no DOM access beyond the passed ctx.
 * Reused by PDF rasterizer in Plan 2 with an OffscreenCanvas ctx.
 */
export function drawFocalLength(
  ctx: CanvasRenderingContext2D,
  block: FocalLengthBlock,
  opts: DrawFocalLengthOpts,
): void {
  const { width, height } = opts
  const barColor = opts.barColor ?? '#5b9bff'
  const axisColor = opts.axisColor ?? '#888'

  ctx.clearRect(0, 0, width, height)
  if (block.histogram.length === 0) return

  const minMm = opts.minMm ?? block.histogram[0]!.mm
  const maxMm = opts.maxMm ?? block.histogram[block.histogram.length - 1]!.mm
  const maxCount = Math.max(...block.histogram.map((b) => b.count))
  if (maxCount === 0) return

  const padL = 32,
    padR = 8,
    padT = 8,
    padB = 24
  const innerW = width - padL - padR
  const innerH = height - padT - padB
  const span = Math.max(1, maxMm - minMm)
  const barW = Math.max(1, innerW / span)

  ctx.fillStyle = barColor
  for (const bin of block.histogram) {
    const x = padL + ((bin.mm - minMm) / span) * innerW
    const h = (bin.count / maxCount) * innerH
    ctx.fillRect(x, padT + (innerH - h), Math.max(1, barW - 0.5), h)
  }

  ctx.strokeStyle = axisColor
  ctx.fillStyle = axisColor
  ctx.font = '11px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.beginPath()
  ctx.moveTo(padL, padT + innerH + 0.5)
  ctx.lineTo(padL + innerW, padT + innerH + 0.5)
  ctx.stroke()
  const ticks = [14, 24, 35, 50, 85, 135, 200, 400].filter((m) => m >= minMm && m <= maxMm)
  for (const m of ticks) {
    const x = padL + ((m - minMm) / span) * innerW
    ctx.fillText(`${m}`, x, padT + innerH + 14)
  }

  // Label top peaks inline
  ctx.textAlign = 'left'
  ctx.fillStyle = axisColor
  for (const peak of block.topPeaks.slice(0, 5)) {
    const x = padL + ((peak.mm - minMm) / span) * innerW
    ctx.fillText(`${peak.mm}mm · ${peak.pctOfTotal.toFixed(0)}%`, x + 2, padT + 10)
  }
}

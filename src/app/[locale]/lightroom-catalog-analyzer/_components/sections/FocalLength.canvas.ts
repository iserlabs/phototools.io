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
  const wideTicks = [14, 18, 24, 28, 35, 40, 50, 70, 85, 100]
  const teleTicks = [100, 135, 200, 300, 400, 600]
  const allTicks = [...new Set([...wideTicks, ...teleTicks])].sort((a, b) => a - b)
    .filter((m) => m >= minMm && m <= maxMm)
  const minTickGap = ctx.measureText('000').width + 8
  const filteredTicks: number[] = []
  let lastX = -Infinity
  for (const m of allTicks) {
    const x = padL + ((m - minMm) / span) * innerW
    if (x - lastX >= minTickGap) { filteredTicks.push(m); lastX = x }
  }
  for (const m of filteredTicks) {
    const x = padL + ((m - minMm) / span) * innerW
    ctx.fillText(`${m}`, x, padT + innerH + 14)
  }

  // Annotate only the single dominant peak. Labeling every peak collides badly
  // when focal lengths cluster (a prime-heavy catalog piles them at one x); the
  // complete ranked list is rendered as text directly below the chart anyway.
  const peak = block.topPeaks[0]
  if (peak) {
    const label = `${peak.mm}mm · ${peak.pctOfTotal.toFixed(0)}%`
    ctx.fillStyle = axisColor
    ctx.textAlign = 'left'
    const rawX = padL + ((peak.mm - minMm) / span) * innerW + 4
    const labelW = ctx.measureText(label).width
    // Clamp so the label stays inside the plot area instead of clipping the edge.
    const x = Math.max(padL, Math.min(rawX, padL + innerW - labelW))
    ctx.fillText(label, x, padT + 10)
  }
}

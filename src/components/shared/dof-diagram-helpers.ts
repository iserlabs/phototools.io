export const W = 700
export const H = 140
export const PAD_L = 40
export const PAD_R = 30
export const STRIP_Y = 14
export const STRIP_H = 52
export const LABEL_Y = STRIP_Y + STRIP_H + 16
export const AXIS_Y = LABEL_Y + 18

const MIN_DIST = 0.3
const MAX_DIST = 100
const MIN_LOG = Math.log(0.2)
const MAX_LOG = Math.log(150)

export function distToX(dist: number): number {
  const usable = W - PAD_L - PAD_R
  const t = (Math.log(Math.max(dist, 0.2)) - MIN_LOG) / (MAX_LOG - MIN_LOG)
  return PAD_L + t * usable
}

export function xToDist(x: number): number {
  const usable = W - PAD_L - PAD_R
  const t = (x - PAD_L) / usable
  const dist = Math.exp(MIN_LOG + t * (MAX_LOG - MIN_LOG))
  return Math.max(MIN_DIST, Math.min(MAX_DIST, dist))
}

export function formatDist(m: number): string {
  if (!isFinite(m)) return '∞'
  if (m < 1) return `${(m * 100).toFixed(0)} cm`
  return `${m.toFixed(2)} m`
}

export function formatDistShort(m: number): string {
  if (!isFinite(m)) return '∞'
  if (m < 1) return `${(m * 100).toFixed(0)}cm`
  if (m < 10) return `${m.toFixed(1)}m`
  return `${m.toFixed(0)}m`
}

interface BokehCircle {
  cx: number
  cy: number
  r: number
  o: number
}

export function computeBokehNear(nearX: number): BokehCircle[] {
  const circles: BokehCircle[] = []
  const span = nearX - PAD_L
  if (span < 10) return circles
  for (let i = 0; i < 8; i++) {
    const t = (i + 0.5) / 8
    const x = PAD_L + t * span
    const edge = Math.min(t, 1 - t) * 2
    circles.push({
      cx: x,
      cy: STRIP_Y + 10 + (i % 3) * 16,
      r: 3 + (1 - edge) * 4,
      o: 0.06 + (1 - edge) * 0.08,
    })
  }
  return circles
}

export function computeBokehFar(farX: number, farIsInfinity: boolean): BokehCircle[] {
  const circles: BokehCircle[] = []
  const span = W - PAD_R - farX
  if (span < 10 || farIsInfinity) return circles
  for (let i = 0; i < 8; i++) {
    const t = (i + 0.5) / 8
    const x = farX + t * span
    const edge = Math.min(t, 1 - t) * 2
    circles.push({
      cx: x,
      cy: STRIP_Y + 8 + (i % 3) * 18,
      r: 3 + edge * 5,
      o: 0.06 + edge * 0.1,
    })
  }
  return circles
}

export const AXIS_TICKS = [0.3, 0.5, 1, 2, 3, 5, 10, 20, 50, 100]

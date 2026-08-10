export type BokehShapeId = 'disc' | 'blade5' | 'blade6' | 'blade7' | 'blade8' | 'blade9' | 'cata'
export interface Tap { x: number; y: number }
export const TAP_COUNT = 64
const CATA_INNER_R2 = 0.45 // catadioptric annulus inner radius²

function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000 }
}

export function ngonVertices(n: number): Tap[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return { x: Math.cos(a), y: Math.sin(a) }
  })
}

function insideNgon(x: number, y: number, n: number): boolean {
  const v = ngonVertices(n)
  for (let i = 0; i < n; i++) {
    const a = v[i], b = v[(i + 1) % n]
    if ((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x) < 0) return false
  }
  return true
}

export function insideShape(x: number, y: number, shape: BokehShapeId): boolean {
  const r2 = x * x + y * y
  if (shape === 'disc') return r2 <= 1
  if (shape === 'cata') return r2 <= 1 && r2 >= CATA_INNER_R2
  return insideNgon(x, y, Number(shape.slice(5)))
}

/** Rejection-sampled taps inside the aperture shape, recentered to zero centroid. */
export function generateKernel(shape: BokehShapeId, tapCount = TAP_COUNT, seed = 7): Tap[] {
  const rand = lcg(seed)
  const taps: Tap[] = []
  while (taps.length < tapCount) {
    const x = rand() * 2 - 1
    const y = rand() * 2 - 1
    if (insideShape(x, y, shape)) taps.push({ x, y })
  }
  const cx = taps.reduce((a, t) => a + t.x, 0) / tapCount
  const cy = taps.reduce((a, t) => a + t.y, 0) / tapCount
  return taps.map((t) => ({ x: t.x - cx, y: t.y - cy }))
}

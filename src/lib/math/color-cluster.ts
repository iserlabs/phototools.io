import { CLUSTER } from '@/lib/data/colorAnalyzer'
import { rgbToHsl } from '@/lib/math/color'
import { isNeutral } from './color-name'

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface ClusterPick { x: number; y: number; rgb: { r: number; g: number; b: number } }

interface Px { i: number; r: number; g: number; b: number }

function dist2(p: Px, c: number[]): number {
  const dr = p.r - c[0], dg = p.g - c[1], db = p.b - c[2]
  return dr * dr + dg * dg + db * db
}

export function dominantColors(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  opts: { k?: number; iterations?: number; seed?: number; chromaticMinFraction?: number } = {},
): ClusterPick[] {
  const k = opts.k ?? CLUSTER.k
  const iterations = opts.iterations ?? CLUSTER.iterations
  const minFrac = opts.chromaticMinFraction ?? CLUSTER.chromaticMinFraction
  const total = width * height
  if (total === 0) return []

  const all: Px[] = []
  const chromatic: Px[] = []
  for (let i = 0; i < total; i++) {
    const p = { i, r: data[i * 4], g: data[i * 4 + 1], b: data[i * 4 + 2] }
    all.push(p)
    if (!isNeutral(rgbToHsl(p.r, p.g, p.b))) chromatic.push(p)
  }
  const pixels = chromatic.length >= minFrac * total && chromatic.length > 0 ? chromatic : all
  const kk = Math.min(k, pixels.length)

  // k-means++ seeding
  const rand = mulberry32(opts.seed ?? CLUSTER.seed)
  const centroids: number[][] = []
  const first = pixels[Math.floor(rand() * pixels.length)]
  centroids.push([first.r, first.g, first.b])
  while (centroids.length < kk) {
    const d = pixels.map((p) => Math.min(...centroids.map((c) => dist2(p, c))))
    const sum = d.reduce((a, b) => a + b, 0)
    if (sum === 0) break
    let r = rand() * sum
    let idx = 0
    for (; idx < d.length - 1; idx++) { r -= d[idx]; if (r <= 0) break }
    centroids.push([pixels[idx].r, pixels[idx].g, pixels[idx].b])
  }

  // Lloyd iterations
  const assign = new Int32Array(pixels.length)
  for (let it = 0; it < iterations; it++) {
    const sums = centroids.map(() => [0, 0, 0, 0])
    for (let i = 0; i < pixels.length; i++) {
      let best = 0, bd = Infinity
      for (let c = 0; c < centroids.length; c++) {
        const dd = dist2(pixels[i], centroids[c])
        if (dd < bd) { bd = dd; best = c }
      }
      assign[i] = best
      const s = sums[best]; s[0] += pixels[i].r; s[1] += pixels[i].g; s[2] += pixels[i].b; s[3]++
    }
    for (let c = 0; c < centroids.length; c++) {
      if (sums[c][3] > 0) centroids[c] = [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]]
    }
  }

  // Representative pixel = member nearest its centroid; empty clusters dropped
  const picks: ClusterPick[] = []
  for (let c = 0; c < centroids.length; c++) {
    let best: Px | null = null, bd = Infinity
    for (let i = 0; i < pixels.length; i++) {
      if (assign[i] !== c) continue
      const dd = dist2(pixels[i], centroids[c])
      if (dd < bd) { bd = dd; best = pixels[i] }
    }
    if (!best) continue
    picks.push({
      x: ((best.i % width) + 0.5) / width,
      y: (Math.floor(best.i / width) + 0.5) / height,
      rgb: { r: best.r, g: best.g, b: best.b },
    })
  }
  return picks
}

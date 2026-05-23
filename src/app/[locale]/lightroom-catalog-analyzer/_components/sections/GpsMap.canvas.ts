import type { GPSBlock } from '@/lib/lrcat/types'

export interface GeoFeatureCollection {
  type: 'FeatureCollection'
  features: Array<{ type: 'Feature'; geometry: { type: string; coordinates: unknown }; properties?: Record<string, unknown> }>
}

export interface DrawGpsOpts {
  width: number
  height: number
  outlineColor?: string
  clusterColor?: string
  background?: string
}

function projLng(lng: number, w: number): number {
  return ((lng + 180) / 360) * w
}
function projLat(lat: number, h: number): number {
  return ((90 - lat) / 180) * h
}

function strokeRing(ctx: CanvasRenderingContext2D, ring: number[][], w: number, h: number) {
  ctx.beginPath()
  for (let i = 0; i < ring.length; i++) {
    const pt = ring[i]!
    const x = projLng(pt[0]!, w)
    const y = projLat(pt[1]!, h)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}

/**
 * Draw an equirectangular world map with continent outlines + cluster circles.
 * `world` may be null if the GeoJSON has not loaded yet — the function will
 * skip the outlines and just draw the clusters.
 */
export function drawGpsMap(
  ctx: CanvasRenderingContext2D,
  block: GPSBlock,
  world: GeoFeatureCollection | null,
  opts: DrawGpsOpts,
): void {
  const { width, height } = opts
  const outline = opts.outlineColor ?? '#555'
  const fill = opts.clusterColor ?? '#5b9bff'
  ctx.fillStyle = opts.background ?? '#111'
  ctx.fillRect(0, 0, width, height)

  if (world) {
    ctx.strokeStyle = outline
    ctx.lineWidth = 0.75
    for (const feature of world.features) {
      const g = feature.geometry
      if (g.type === 'Polygon') {
        for (const ring of g.coordinates as number[][][]) strokeRing(ctx, ring, width, height)
      } else if (g.type === 'MultiPolygon') {
        for (const poly of g.coordinates as number[][][][]) {
          for (const ring of poly) strokeRing(ctx, ring, width, height)
        }
      }
    }
  }

  const maxCount = Math.max(1, ...block.clusters.map((c) => c.count))
  for (const c of block.clusters) {
    const x = projLng(c.lng, width)
    const y = projLat(c.lat, height)
    const r = 2 + 8 * (c.count / maxCount)
    ctx.globalAlpha = 0.5 + 0.5 * (c.count / maxCount)
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

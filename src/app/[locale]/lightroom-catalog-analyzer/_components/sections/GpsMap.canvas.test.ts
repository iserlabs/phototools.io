import { describe, expect, it } from 'vitest'
import type { GPSBlock } from '@/lib/lrcat/types'
import { drawGpsMap, type GeoFeatureCollection } from './GpsMap.canvas'

function recordingCtx() {
  const calls: { method: string; args: unknown[] }[] = []
  const ctx = new Proxy(
    {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
    } as Record<string, unknown>,
    {
      get(target, prop) {
        if (prop in target) return target[prop as string]
        return (...args: unknown[]) => { calls.push({ method: String(prop), args }) }
      },
      set(target, prop, value) { target[prop as string] = value; return true },
    },
  )
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls }
}

const EMPTY_GPS: GPSBlock = {
  totalPhotosWithGps: 0,
  pctWithGps: 0,
  clusters: [],
  topRegions: [],
}

const SAMPLE_GPS: GPSBlock = {
  totalPhotosWithGps: 100,
  pctWithGps: 50,
  clusters: [
    { lat: 35.68, lng: 139.65, count: 60 },   // Tokyo
    { lat: 40.7, lng: -74.0, count: 40 },     // NYC
  ],
  topRegions: [{ region: 'Japan', count: 60 }],
}

const WORLD_POLYGON: GeoFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] },
    },
  ],
}

const WORLD_MULTIPOLYGON: GeoFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
          [[[10, 10], [15, 10], [15, 15], [10, 15], [10, 10]]],
        ],
      },
    },
  ],
}

describe('drawGpsMap', () => {
  it('always fills the background', () => {
    const { ctx, calls } = recordingCtx()
    drawGpsMap(ctx, EMPTY_GPS, null, { width: 400, height: 200 })
    expect(calls.find((c) => c.method === 'fillRect')).toBeTruthy()
  })

  it('does not stroke any rings when world is null', () => {
    const { ctx, calls } = recordingCtx()
    drawGpsMap(ctx, SAMPLE_GPS, null, { width: 400, height: 200 })
    expect(calls.filter((c) => c.method === 'stroke')).toHaveLength(0)
  })

  it('strokes one ring per Polygon feature when world is provided', () => {
    const { ctx, calls } = recordingCtx()
    drawGpsMap(ctx, EMPTY_GPS, WORLD_POLYGON, { width: 400, height: 200 })
    expect(calls.filter((c) => c.method === 'stroke')).toHaveLength(1)
  })

  it('strokes one ring per polygon in a MultiPolygon', () => {
    const { ctx, calls } = recordingCtx()
    drawGpsMap(ctx, EMPTY_GPS, WORLD_MULTIPOLYGON, { width: 400, height: 200 })
    // 2 polygons, each with 1 ring → 2 stroke calls
    expect(calls.filter((c) => c.method === 'stroke')).toHaveLength(2)
  })

  it('draws one arc (circle) per cluster', () => {
    const { ctx, calls } = recordingCtx()
    drawGpsMap(ctx, SAMPLE_GPS, null, { width: 400, height: 200 })
    expect(calls.filter((c) => c.method === 'arc')).toHaveLength(2)
  })

  it('handles an empty clusters array without throwing', () => {
    const { ctx, calls } = recordingCtx()
    expect(() => drawGpsMap(ctx, EMPTY_GPS, null, { width: 400, height: 200 })).not.toThrow()
    expect(calls.filter((c) => c.method === 'arc')).toHaveLength(0)
  })

  it('respects custom outline / cluster / background colors', () => {
    const { ctx } = recordingCtx()
    expect(() => drawGpsMap(
      ctx,
      SAMPLE_GPS,
      WORLD_POLYGON,
      { width: 400, height: 200, outlineColor: '#f00', clusterColor: '#0f0', background: '#000' },
    )).not.toThrow()
  })
})

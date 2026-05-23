import { beforeAll, describe, expect, it, vi } from 'vitest'
import { CHART_W, CHART_H, rasterizeCanvasChart } from './chart-rasterizer-canvas'
import type { FocalLengthBlock, GPSBlock, HeatmapBlock } from '@/lib/lrcat/types'

// jsdom does not implement OffscreenCanvas or 2D rendering. Register a minimal
// stub so the data-URL contract is exercised without a real renderer. The point
// of this test is the contract (draw* is invoked with a 2D ctx; the output is a
// data:image/png;base64,… string), not pixel fidelity — real rasterization is
// exercised by the Playwright E2E (Task 18.1) against a Chromium canvas.
beforeAll(() => {
  if (typeof OffscreenCanvas === 'undefined') {
    class FakeCtx {
      clearRect() {}
      fillRect() {}
      beginPath() {}
      moveTo() {}
      lineTo() {}
      stroke() {}
      arc() {}
      fill() {}
      fillText() {}
      scale() {}
      set fillStyle(_v: unknown) {}
      set strokeStyle(_v: unknown) {}
      set font(_v: unknown) {}
      set textAlign(_v: unknown) {}
      set lineWidth(_v: unknown) {}
      set globalAlpha(_v: unknown) {}
    }
    class FakeOffscreen {
      width = 0
      height = 0
      constructor(w: number, h: number) {
        this.width = w
        this.height = h
      }
      getContext() {
        return new FakeCtx() as unknown as OffscreenCanvasRenderingContext2D
      }
      convertToBlob() {
        return Promise.resolve(new Blob([new Uint8Array([1])], { type: 'image/png' }))
      }
    }
    vi.stubGlobal('OffscreenCanvas', FakeOffscreen)
  }
})

const focal: FocalLengthBlock = {
  histogram: [{ mm: 24, count: 10 }, { mm: 35, count: 40 }, { mm: 50, count: 20 }],
  topPeaks: [{ mm: 35, pctOfTotal: 22 }],
  bestOnePrime: { mm: 35, coveragePct: 47 },
}
const heatmap: HeatmapBlock = {
  byDay: [{ date: '2024-01-15', count: 12, topLens: 'L1' }],
  years: [2024],
}
const gps: GPSBlock = {
  totalPhotosWithGps: 100, pctWithGps: 30,
  clusters: [{ lat: 40, lng: -74, count: 50 }],
  topRegions: [{ region: 'US', count: 50 }],
}

describe('rasterizeCanvasChart', () => {
  it('exposes the standardized 800×400 logical dimensions', () => {
    expect(CHART_W).toBe(800)
    expect(CHART_H).toBe(400)
  })

  it('rasterizes a focal-length histogram to a PNG data URL', async () => {
    const url = await rasterizeCanvasChart('focalLength', focal)
    expect(url).toMatch(/^data:image\/png;base64,/)
  })

  it('rasterizes a heatmap to a PNG data URL', async () => {
    const url = await rasterizeCanvasChart('heatmap', heatmap)
    expect(url).toMatch(/^data:image\/png;base64,/)
  })

  it('rasterizes a GPS map (no world outlines) to a PNG data URL', async () => {
    const url = await rasterizeCanvasChart('gps', gps, null)
    expect(url).toMatch(/^data:image\/png;base64,/)
  })
})

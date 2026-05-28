import { describe, expect, it } from 'vitest'
import type { HeatmapBlock } from '@/lib/lrcat/types'
import { drawHeatmap } from './Heatmap.canvas'

function fakeCtx(): CanvasRenderingContext2D {
  return {
    clearRect: () => {},
    fillRect: () => {},
    fillText: () => {},
    measureText: () => ({ width: 0 }),
    font: '',
    fillStyle: '',
    textAlign: 'left',
  } as unknown as CanvasRenderingContext2D
}

const SAMPLE: HeatmapBlock = {
  byDay: [
    { date: '2025-01-01', count: 5, topLens: '24mm f/1.4' },
    { date: '2025-06-15', count: 12, topLens: '50mm f/1.8' },
    { date: '2026-03-10', count: 3, topLens: null },
  ],
  years: [2025, 2026],
}

describe('drawHeatmap', () => {
  it('returns an empty array when byDay is empty', () => {
    const result = drawHeatmap(fakeCtx(), { byDay: [], years: [] }, { width: 800, height: 200 })
    expect(result).toEqual([])
  })

  it('returns one hit-box per non-zero day', () => {
    const result = drawHeatmap(fakeCtx(), SAMPLE, { width: 800, height: 200 })
    expect(result).toHaveLength(3)
    expect(result.map((h) => h.date).sort()).toEqual(['2025-01-01', '2025-06-15', '2026-03-10'])
  })

  it('preserves topLens on hit-boxes (including null)', () => {
    const result = drawHeatmap(fakeCtx(), SAMPLE, { width: 800, height: 200 })
    expect(result.find((h) => h.date === '2025-01-01')?.topLens).toBe('24mm f/1.4')
    expect(result.find((h) => h.date === '2026-03-10')?.topLens).toBeNull()
  })

  it('scales cell size with available width', () => {
    const narrow = drawHeatmap(fakeCtx(), SAMPLE, { width: 600, height: 200 })
    const wide = drawHeatmap(fakeCtx(), SAMPLE, { width: 1400, height: 200 })
    // wider canvas → larger cells (clamped at 16)
    expect(wide[0]!.w).toBeGreaterThanOrEqual(narrow[0]!.w)
  })

  it('clamps cell size to [8, 16]', () => {
    const tiny = drawHeatmap(fakeCtx(), SAMPLE, { width: 100, height: 200 })
    const huge = drawHeatmap(fakeCtx(), SAMPLE, { width: 5000, height: 200 })
    for (const box of tiny) expect(box.w).toBeGreaterThanOrEqual(8)
    for (const box of huge) expect(box.w).toBeLessThanOrEqual(16)
  })

  it('respects explicit cellSize override', () => {
    const result = drawHeatmap(fakeCtx(), SAMPLE, { width: 800, height: 200, cellSize: 12 })
    for (const box of result) expect(box.w).toBe(12)
  })

  it('places cells with consistent x increments (week columns)', () => {
    const result = drawHeatmap(fakeCtx(), SAMPLE, { width: 800, height: 200, cellSize: 10, gap: 2 })
    const jan1 = result.find((h) => h.date === '2025-01-01')!
    // First cell starts at padX=32
    expect(jan1.x).toBe(32)
  })

  it('skips zero-count days (no hit-boxes for blank cells)', () => {
    const sparse: HeatmapBlock = {
      byDay: [{ date: '2025-01-01', count: 0, topLens: null }],
      years: [2025],
    }
    expect(drawHeatmap(fakeCtx(), sparse, { width: 800, height: 200 })).toEqual([])
  })
})

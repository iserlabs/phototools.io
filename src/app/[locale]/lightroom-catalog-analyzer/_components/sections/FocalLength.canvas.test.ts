import { describe, expect, it } from 'vitest'
import type { FocalLengthBlock } from '@/lib/lrcat/types'
import { drawFocalLength } from './FocalLength.canvas'

function recordingCtx() {
  const calls: { method: string; args: unknown[] }[] = []
  const ctx = new Proxy(
    {
      font: '',
      fillStyle: '',
      strokeStyle: '',
      textAlign: 'left',
    } as Record<string, unknown>,
    {
      get(target, prop) {
        if (prop in target) return target[prop as string]
        if (prop === 'measureText') return (s: string) => ({ width: s.length * 6 })
        return (...args: unknown[]) => { calls.push({ method: String(prop), args }) }
      },
      set(target, prop, value) { target[prop as string] = value; return true },
    },
  )
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls }
}

function block(histogram: Array<{ mm: number; count: number }>, topPeaks: FocalLengthBlock['topPeaks'] = []): FocalLengthBlock {
  return { histogram, topPeaks, bestOnePrime: null }
}

describe('drawFocalLength', () => {
  it('does nothing for an empty histogram (only clears)', () => {
    const { ctx, calls } = recordingCtx()
    drawFocalLength(ctx, block([]), { width: 400, height: 200 })
    expect(calls.filter((c) => c.method === 'clearRect')).toHaveLength(1)
    expect(calls.filter((c) => c.method === 'fillRect')).toHaveLength(0)
  })

  it('does nothing when all counts are zero', () => {
    const { ctx, calls } = recordingCtx()
    drawFocalLength(ctx, block([{ mm: 35, count: 0 }, { mm: 50, count: 0 }]), { width: 400, height: 200 })
    expect(calls.filter((c) => c.method === 'fillRect')).toHaveLength(0)
  })

  it('draws one fillRect per histogram bin (plus tick text)', () => {
    const { ctx, calls } = recordingCtx()
    drawFocalLength(
      ctx,
      block([{ mm: 24, count: 10 }, { mm: 35, count: 20 }, { mm: 50, count: 15 }]),
      { width: 400, height: 200 },
    )
    // 3 bins → 3 fillRect calls
    expect(calls.filter((c) => c.method === 'fillRect')).toHaveLength(3)
  })

  it('annotates the dominant peak when topPeaks is non-empty', () => {
    const { ctx, calls } = recordingCtx()
    drawFocalLength(
      ctx,
      block([{ mm: 35, count: 100 }], [{ mm: 35, pctOfTotal: 47 }]),
      { width: 400, height: 200 },
    )
    const labels = calls.filter((c) => c.method === 'fillText').map((c) => String(c.args[0]))
    expect(labels).toContain('35mm · 47%')
  })

  it('respects minMm/maxMm to filter ticks', () => {
    const { ctx, calls } = recordingCtx()
    drawFocalLength(
      ctx,
      block([{ mm: 14, count: 5 }, { mm: 24, count: 10 }, { mm: 50, count: 8 }, { mm: 200, count: 3 }]),
      { width: 800, height: 200, minMm: 14, maxMm: 100 },
    )
    const labels = calls.filter((c) => c.method === 'fillText').map((c) => String(c.args[0]))
    // Tick set [14, 18, 24, 28, 35, 40, 50, 70, 85, 100] all <= 100
    expect(labels).toContain('14')
    expect(labels).toContain('100')
    expect(labels).not.toContain('200')
    expect(labels).not.toContain('400')
  })

  it('filters overlapping ticks when canvas is too narrow', () => {
    const { ctx, calls } = recordingCtx()
    drawFocalLength(
      ctx,
      block([{ mm: 14, count: 10 }, { mm: 600, count: 10 }]),
      { width: 200, height: 100, minMm: 14, maxMm: 600 },
    )
    const labels = calls.filter((c) => c.method === 'fillText').map((c) => String(c.args[0]))
    const numericLabels = labels.filter((l) => /^\d+$/.test(l))
    // With a narrow canvas, fewer than 16 ticks should fit
    expect(numericLabels.length).toBeLessThan(16)
  })

  it('uses provided colors', () => {
    const { ctx } = recordingCtx()
    expect(() => drawFocalLength(
      ctx,
      block([{ mm: 35, count: 10 }]),
      { width: 400, height: 200, barColor: '#f00', axisColor: '#0f0' },
    )).not.toThrow()
  })

  it('omits peak annotation when topPeaks is empty', () => {
    const { ctx, calls } = recordingCtx()
    drawFocalLength(ctx, block([{ mm: 35, count: 10 }]), { width: 400, height: 200 })
    const labels = calls.filter((c) => c.method === 'fillText').map((c) => String(c.args[0]))
    // Only numeric tick labels — no "Xmm · Y%" annotation
    expect(labels.find((l) => l.includes('·'))).toBeUndefined()
  })
})

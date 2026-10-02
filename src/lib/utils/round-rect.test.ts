import { describe, it, expect, vi } from 'vitest'
import { roundRectPath } from './round-rect'

function mockCtx(withNative = true) {
  const ctx = {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    closePath: vi.fn(),
    ...(withNative ? { roundRect: vi.fn() } : {}),
  }
  return ctx as unknown as CanvasRenderingContext2D & typeof ctx
}

describe('roundRectPath', () => {
  it('passes the radius as a one-element sequence to native roundRect', () => {
    // Chromium 97/98 vendor builds (Honor/Baidu T7) only accept the sequence
    // form and throw "cannot be converted to a sequence" for a bare number.
    const ctx = mockCtx()
    roundRectPath(ctx, 10, 20, 100, 50, 4)
    expect(ctx.beginPath).toHaveBeenCalledTimes(1)
    expect(ctx.roundRect).toHaveBeenCalledWith(10, 20, 100, 50, [4])
    expect(ctx.arcTo).not.toHaveBeenCalled()
  })

  it('falls back to arcTo when the context has no roundRect', () => {
    const ctx = mockCtx(false)
    roundRectPath(ctx, 0, 0, 100, 50, 8)
    expect(ctx.beginPath).toHaveBeenCalledTimes(1)
    expect(ctx.arcTo).toHaveBeenCalledTimes(4)
    expect(ctx.closePath).toHaveBeenCalledTimes(1)
    // first corner: top-right, radius 8
    expect(ctx.arcTo).toHaveBeenNthCalledWith(1, 100, 0, 100, 8, 8)
  })

  it('clamps the radius to [0, min(w, h) / 2]', () => {
    const native = mockCtx()
    roundRectPath(native, 0, 0, 100, 10, 40)
    expect(native.roundRect).toHaveBeenCalledWith(0, 0, 100, 10, [5])

    roundRectPath(native, 0, 0, 100, 10, -3)
    expect(native.roundRect).toHaveBeenLastCalledWith(0, 0, 100, 10, [0])

    const fallback = mockCtx(false)
    roundRectPath(fallback, 0, 0, 100, 10, 40)
    expect(fallback.arcTo).toHaveBeenNthCalledWith(1, 100, 0, 100, 5, 5)
  })

  it('treats a non-finite radius as 0', () => {
    const ctx = mockCtx()
    roundRectPath(ctx, 0, 0, 100, 50, Number.NaN)
    expect(ctx.roundRect).toHaveBeenCalledWith(0, 0, 100, 50, [0])
  })
})

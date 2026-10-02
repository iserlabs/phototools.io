import { describe, it, expect, vi } from 'vitest'
import {
  computeExportDimensions,
  drawSolidBorder,
  drawGradientBorder,
  drawInnerMat,
  drawShadow,
} from './frame-border'
import type { ShadowOptions } from './frame-border'

function mockCtx() {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    rect: vi.fn(),
    fillRect: vi.fn(),
    roundRect: vi.fn(),
    clip: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D
}

describe('computeExportDimensions', () => {
  it('adds border width on all sides', () => {
    const { width, height } = computeExportDimensions(1920, 1080, 50, 0)
    expect(width).toBe(2020)
    expect(height).toBe(1180)
  })

  it('adds inner mat width when present', () => {
    const { width, height } = computeExportDimensions(1920, 1080, 50, 10)
    expect(width).toBe(2040)
    expect(height).toBe(1200)
  })

  it('returns original dimensions with zero border and zero mat', () => {
    const { width, height } = computeExportDimensions(4000, 3000, 0, 0)
    expect(width).toBe(4000)
    expect(height).toBe(3000)
  })

  it('handles zero image dimensions', () => {
    const { width, height } = computeExportDimensions(0, 0, 20, 5)
    expect(width).toBe(50)
    expect(height).toBe(50)
  })

  it('handles very large values', () => {
    const { width, height } = computeExportDimensions(10000, 8000, 500, 100)
    expect(width).toBe(11200)
    expect(height).toBe(9200)
  })

  it('handles only inner mat with no border', () => {
    const { width, height } = computeExportDimensions(800, 600, 0, 15)
    expect(width).toBe(830)
    expect(height).toBe(630)
  })
})

describe('drawSolidBorder', () => {
  it('fills the canvas with the border color (no radius)', () => {
    const ctx = mockCtx()
    drawSolidBorder(ctx, 2020, 1180, '#ffffff', 0)
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 2020, 1180)
    expect(ctx.fillStyle).toBe('#ffffff')
    expect(ctx.roundRect).not.toHaveBeenCalled()
  })

  it('uses roundRect when corner radius > 0', () => {
    const ctx = mockCtx()
    drawSolidBorder(ctx, 2020, 1180, '#333333', 12)
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.roundRect).toHaveBeenCalledWith(0, 0, 2020, 1180, [12])
    expect(ctx.fill).toHaveBeenCalled()
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it('sets the correct fill color', () => {
    const ctx = mockCtx()
    drawSolidBorder(ctx, 100, 100, 'rgb(128,64,32)', 0)
    expect(ctx.fillStyle).toBe('rgb(128,64,32)')
  })
})

describe('drawGradientBorder', () => {
  it('creates a linear gradient for "top" direction', () => {
    const ctx = mockCtx()
    drawGradientBorder(ctx, 1920, 1080, '#ff0000', '#0000ff', 'top', 0)
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 1080, 0, 0)
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080)
  })

  it('creates a linear gradient for "bottom" direction', () => {
    const ctx = mockCtx()
    drawGradientBorder(ctx, 1920, 1080, '#ff0000', '#0000ff', 'bottom', 0)
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 1080)
  })

  it('creates a linear gradient for "left" direction', () => {
    const ctx = mockCtx()
    drawGradientBorder(ctx, 1920, 1080, '#ff0000', '#0000ff', 'left', 0)
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(1920, 0, 0, 0)
  })

  it('creates a linear gradient for "right" direction', () => {
    const ctx = mockCtx()
    drawGradientBorder(ctx, 1920, 1080, '#ff0000', '#0000ff', 'right', 0)
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 0, 1920, 0)
  })

  it('creates a linear gradient for "diagonal-tl" direction', () => {
    const ctx = mockCtx()
    drawGradientBorder(ctx, 1920, 1080, '#ff0000', '#0000ff', 'diagonal-tl', 0)
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(1920, 1080, 0, 0)
  })

  it('creates a linear gradient for "diagonal-tr" direction', () => {
    const ctx = mockCtx()
    drawGradientBorder(ctx, 1920, 1080, '#ff0000', '#0000ff', 'diagonal-tr', 0)
    expect(ctx.createLinearGradient).toHaveBeenCalledWith(0, 1080, 1920, 0)
  })

  it('creates a radial gradient for "radial" direction', () => {
    const ctx = mockCtx()
    drawGradientBorder(ctx, 1920, 1080, '#ff0000', '#0000ff', 'radial', 0)
    expect(ctx.createRadialGradient).toHaveBeenCalledWith(960, 540, 0, 960, 540, 960)
    expect(ctx.createLinearGradient).not.toHaveBeenCalled()
  })

  it('uses max dimension for radial gradient radius', () => {
    const ctx = mockCtx()
    drawGradientBorder(ctx, 400, 800, '#ff0000', '#0000ff', 'radial', 0)
    // radius = max(400, 800) / 2 = 400
    expect(ctx.createRadialGradient).toHaveBeenCalledWith(200, 400, 0, 200, 400, 400)
  })

  it('applies corner radius when > 0', () => {
    const ctx = mockCtx()
    drawGradientBorder(ctx, 1920, 1080, '#ff0000', '#0000ff', 'top', 20)
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.roundRect).toHaveBeenCalledWith(0, 0, 1920, 1080, [20])
    expect(ctx.fill).toHaveBeenCalled()
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it('uses fillRect when corner radius is 0', () => {
    const ctx = mockCtx()
    drawGradientBorder(ctx, 1920, 1080, '#ff0000', '#0000ff', 'top', 0)
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080)
    expect(ctx.roundRect).not.toHaveBeenCalled()
  })
})

describe('drawInnerMat', () => {
  it('draws a rectangular mat inset by borderWidth', () => {
    const ctx = mockCtx()
    drawInnerMat(ctx, 2020, 1180, 50, 0, 10, '#eeeeee')
    expect(ctx.fillRect).toHaveBeenCalledWith(50, 50, 1920, 1080)
    expect(ctx.fillStyle).toBe('#eeeeee')
  })

  it('uses roundRect with adjusted radius when corner radius > 0', () => {
    const ctx = mockCtx()
    drawInnerMat(ctx, 2020, 1180, 50, 20, 10, '#cccccc')
    expect(ctx.beginPath).toHaveBeenCalled()
    // adjusted radius = max(0, 20 - 50/2) = max(0, -5) = 0
    // Actually the code uses cornerRadius - borderWidth / 2 = 20 - 25 = -5 -> clamped to 0
    expect(ctx.roundRect).toHaveBeenCalledWith(50, 50, 1920, 1080, [0])
    expect(ctx.fill).toHaveBeenCalled()
  })

  it('computes positive adjusted corner radius when radius > borderWidth/2', () => {
    const ctx = mockCtx()
    drawInnerMat(ctx, 840, 640, 20, 30, 5, '#dddddd')
    // adjusted radius = max(0, 30 - 20/2) = max(0, 20) = 20
    expect(ctx.roundRect).toHaveBeenCalledWith(20, 20, 800, 600, [20])
  })

  it('sets the correct mat color', () => {
    const ctx = mockCtx()
    drawInnerMat(ctx, 100, 100, 10, 0, 5, 'rgba(255,255,255,0.5)')
    expect(ctx.fillStyle).toBe('rgba(255,255,255,0.5)')
  })
})

describe('drawShadow', () => {
  const defaultOptions: ShadowOptions = {
    color: 'rgba(0,0,0,0.5)',
    blur: 20,
    offsetX: 4,
    offsetY: 8,
  }

  it('sets shadow properties and restores context', () => {
    const ctx = mockCtx()
    drawShadow(ctx, 2020, 1180, 50, 0, defaultOptions)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.shadowColor).toBe('rgba(0,0,0,0.5)')
    expect(ctx.shadowBlur).toBe(20)
    expect(ctx.shadowOffsetX).toBe(4)
    expect(ctx.shadowOffsetY).toBe(8)
    expect(ctx.fillStyle).toBe('rgba(0,0,0,0)')
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 2020, 1180)
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('uses roundRect when corner radius > 0', () => {
    const ctx = mockCtx()
    drawShadow(ctx, 2020, 1180, 50, 15, defaultOptions)
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.roundRect).toHaveBeenCalledWith(0, 0, 2020, 1180, [15])
    expect(ctx.fill).toHaveBeenCalled()
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it('uses fillRect when corner radius is 0', () => {
    const ctx = mockCtx()
    drawShadow(ctx, 2020, 1180, 50, 0, defaultOptions)
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 2020, 1180)
    expect(ctx.roundRect).not.toHaveBeenCalled()
  })

  it('handles zero blur and offsets', () => {
    const ctx = mockCtx()
    const opts: ShadowOptions = { color: '#000', blur: 0, offsetX: 0, offsetY: 0 }
    drawShadow(ctx, 100, 100, 10, 0, opts)
    expect(ctx.shadowBlur).toBe(0)
    expect(ctx.shadowOffsetX).toBe(0)
    expect(ctx.shadowOffsetY).toBe(0)
  })
})

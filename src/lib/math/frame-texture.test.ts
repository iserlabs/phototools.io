import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { TEXTURE_PRESETS } from './frame-texture'

/* jsdom does not provide OffscreenCanvas. The source code checks
   `typeof OffscreenCanvas !== 'undefined'` and uses `instanceof OffscreenCanvas`.
   We polyfill a minimal OffscreenCanvas so the source takes the OffscreenCanvas
   branch and works correctly in tests. */

class FakeOffscreenCanvas {
  width: number
  height: number
  private _ctx: Record<string, unknown>

  constructor(w: number, h: number) {
    this.width = w
    this.height = h
    this._ctx = {
      createImageData: (iw: number, ih: number) => ({
        data: new Uint8ClampedArray(iw * ih * 4),
        width: iw,
        height: ih,
      }),
      putImageData: vi.fn(),
      getImageData: (_x: number, _y: number, gw: number, gh: number) => {
        // Return the data that was put via putImageData, or empty
        return {
          data: new Uint8ClampedArray(gw * gh * 4),
          width: gw,
          height: gh,
        }
      },
    }
  }

  getContext() {
    return this._ctx
  }
}

const origOffscreenCanvas = globalThis.OffscreenCanvas

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.OffscreenCanvas = FakeOffscreenCanvas as any
})

afterAll(() => {
  if (origOffscreenCanvas) {
    globalThis.OffscreenCanvas = origOffscreenCanvas
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).OffscreenCanvas
  }
})

/* Import after polyfill is set up via dynamic import would be ideal,
   but vitest hoists imports. Since beforeAll runs before tests, and the
   source code evaluates `typeof OffscreenCanvas` at call-time, we can
   import statically. The polyfill just needs to be registered before
   any test function body executes. However, vitest hoists beforeAll
   after imports but runs it before `it()` blocks, so the polyfill
   is installed by the time tests run. */

// Re-import: functions reference OffscreenCanvas at call time, not import time
import { generateTexture, drawTextureBorder } from './frame-texture'

function mockCtx() {
  return {
    beginPath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    roundRect: vi.fn(),
    clip: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    drawImage: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn((w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    })),
    getImageData: vi.fn(),
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D
}

describe('TEXTURE_PRESETS', () => {
  it('contains all 6 preset types', () => {
    const keys = Object.keys(TEXTURE_PRESETS)
    expect(keys).toHaveLength(6)
    expect(keys).toEqual(
      expect.arrayContaining(['linen', 'film-grain', 'canvas', 'paper', 'wood', 'marble']),
    )
  })

  it('each preset has valid baseColor RGB values (0-255)', () => {
    for (const [, config] of Object.entries(TEXTURE_PRESETS)) {
      const [r, g, b] = config.baseColor
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThanOrEqual(255)
      expect(g).toBeGreaterThanOrEqual(0)
      expect(g).toBeLessThanOrEqual(255)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(255)
    }
  })

  it('each preset has positive noiseAmount', () => {
    for (const [, config] of Object.entries(TEXTURE_PRESETS)) {
      expect(config.noiseAmount).toBeGreaterThan(0)
    }
  })

  it('each preset has positive noiseScale', () => {
    for (const [, config] of Object.entries(TEXTURE_PRESETS)) {
      expect(config.noiseScale).toBeGreaterThanOrEqual(1)
    }
  })

  it('linen has a warm off-white base color', () => {
    const [r, g, b] = TEXTURE_PRESETS['linen'].baseColor
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
  })

  it('film-grain has a dark base color', () => {
    const [r, g, b] = TEXTURE_PRESETS['film-grain'].baseColor
    expect(r).toBeLessThan(50)
    expect(g).toBeLessThan(50)
    expect(b).toBeLessThan(50)
  })
})

describe('generateTexture', () => {
  it('returns a canvas with correct dimensions', () => {
    const config = TEXTURE_PRESETS['linen']
    const result = generateTexture(config, 200, 100)
    expect(result).toBeInstanceOf(FakeOffscreenCanvas)
    expect((result as OffscreenCanvas).width).toBe(200)
    expect((result as OffscreenCanvas).height).toBe(100)
  })

  it('handles 1x1 canvas', () => {
    const config = TEXTURE_PRESETS['linen']
    const canvas = generateTexture(config, 1, 1)
    expect(canvas.width).toBe(1)
    expect(canvas.height).toBe(1)
  })

  it('handles realistic photo dimensions', () => {
    const config = TEXTURE_PRESETS['wood']
    const canvas = generateTexture(config, 1920, 1080)
    expect(canvas.width).toBe(1920)
    expect(canvas.height).toBe(1080)
  })

  it('calls putImageData on the canvas context', () => {
    const config = TEXTURE_PRESETS['canvas']
    const canvas = generateTexture(config, 10, 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = canvas.getContext('2d')! as any
    expect(ctx.putImageData).toHaveBeenCalledTimes(1)
  })

  it('generates imageData with correct pixel count', () => {
    const config = TEXTURE_PRESETS['paper']
    const canvas = generateTexture(config, 5, 3)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = canvas.getContext('2d')! as any
    const putCall = ctx.putImageData.mock.calls[0]
    const imgData = putCall[0] as unknown as { data: Uint8ClampedArray }
    expect(imgData.data.length).toBe(5 * 3 * 4)
  })

  it('sets alpha channel to 255 for all pixels', () => {
    const config = TEXTURE_PRESETS['paper']
    const canvas = generateTexture(config, 4, 4)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = canvas.getContext('2d')! as any
    const putCall = ctx.putImageData.mock.calls[0]
    const data = (putCall[0] as unknown as { data: Uint8ClampedArray }).data
    for (let i = 3; i < data.length; i += 4) {
      expect(data[i]).toBe(255)
    }
  })

  it('clamps RGB values to [0, 255]', () => {
    // film-grain has high noise (40) on a dark base (30,30,30)
    const config = TEXTURE_PRESETS['film-grain']
    const canvas = generateTexture(config, 20, 20)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = canvas.getContext('2d')! as any
    const putCall = ctx.putImageData.mock.calls[0]
    const data = (putCall[0] as unknown as { data: Uint8ClampedArray }).data
    for (let i = 0; i < data.length; i += 4) {
      expect(data[i]).toBeGreaterThanOrEqual(0)
      expect(data[i]).toBeLessThanOrEqual(255)
      expect(data[i + 1]).toBeGreaterThanOrEqual(0)
      expect(data[i + 1]).toBeLessThanOrEqual(255)
      expect(data[i + 2]).toBeGreaterThanOrEqual(0)
      expect(data[i + 2]).toBeLessThanOrEqual(255)
    }
  })

  it('produces non-uniform noise (not all pixels identical)', () => {
    // With a large enough canvas and noise, pixels should vary
    const config = TEXTURE_PRESETS['film-grain']
    const canvas = generateTexture(config, 50, 50)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = canvas.getContext('2d')! as any
    const putCall = ctx.putImageData.mock.calls[0]
    const data = (putCall[0] as unknown as { data: Uint8ClampedArray }).data
    const firstR = data[0]
    let hasVariation = false
    for (let i = 4; i < data.length; i += 4) {
      if (data[i] !== firstR) {
        hasVariation = true
        break
      }
    }
    expect(hasVariation).toBe(true)
  })
})

describe('drawTextureBorder', () => {
  it('draws texture without clipping when corner radius is 0', () => {
    const ctx = mockCtx()
    drawTextureBorder(ctx, 800, 600, 'linen', 0)
    expect(ctx.drawImage).toHaveBeenCalled()
    expect(ctx.clip).not.toHaveBeenCalled()
  })

  it('clips with roundRect when corner radius > 0', () => {
    const ctx = mockCtx()
    drawTextureBorder(ctx, 800, 600, 'canvas', 16)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.roundRect).toHaveBeenCalledWith(0, 0, 800, 600, [16])
    expect(ctx.clip).toHaveBeenCalled()
    expect(ctx.drawImage).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('draws each texture preset without errors', () => {
    const presets = ['linen', 'film-grain', 'canvas', 'paper', 'wood', 'marble'] as const
    for (const preset of presets) {
      const ctx = mockCtx()
      expect(() => drawTextureBorder(ctx, 400, 300, preset, 0)).not.toThrow()
    }
  })
})

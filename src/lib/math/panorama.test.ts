import { describe, it, expect } from 'vitest'
import {
  rotationIncrement, framesForArc, arcCoverage, stitchedMegapixels, planPanorama,
} from './panorama'
import { calcFOV } from './fov'

// 50mm full-frame: ~39.6° horizontal, ~27.0° vertical
const FOV_50FF = calcFOV(50, 1)

describe('rotationIncrement', () => {
  it('reduces frame FOV by the overlap fraction', () => {
    expect(rotationIncrement(40, 0.3)).toBeCloseTo(28, 5)
    expect(rotationIncrement(40, 0)).toBe(40)
    expect(rotationIncrement(40, 0.5)).toBe(20)
  })
})

describe('framesForArc', () => {
  it('needs 1 frame when the target fits inside a single frame', () => {
    expect(framesForArc(30, 39.6, 0.3)).toBe(1)
    expect(framesForArc(39.6, 39.6, 0.3)).toBe(1)
  })

  it('computes frames for a 180° pano with a 50mm FF lens at 30% overlap', () => {
    // increment ≈ 27.7°; (180 − 39.6) / 27.7 ≈ 5.07 → 6 more frames + first = 7
    expect(framesForArc(180, FOV_50FF.horizontal, 0.3)).toBe(7)
  })

  it('wraps a full 360° with ceil(360 / increment)', () => {
    // increment ≈ 27.7° → ceil(12.99) = 13
    expect(framesForArc(360, FOV_50FF.horizontal, 0.3)).toBe(13)
  })

  it('more overlap means more frames', () => {
    const low = framesForArc(180, FOV_50FF.horizontal, 0.2)
    const high = framesForArc(180, FOV_50FF.horizontal, 0.5)
    expect(high).toBeGreaterThan(low)
  })

  it('longer lenses need more frames for the same arc', () => {
    const wide = framesForArc(180, calcFOV(24, 1).horizontal, 0.3)
    const tele = framesForArc(180, calcFOV(200, 1).horizontal, 0.3)
    expect(tele).toBeGreaterThan(wide)
  })

  it('returns 0 for degenerate inputs', () => {
    expect(framesForArc(180, 0, 0.3)).toBe(0)
    expect(framesForArc(180, 40, 1)).toBe(0)
  })
})

describe('arcCoverage', () => {
  it('single frame covers exactly the frame FOV', () => {
    expect(arcCoverage(1, 39.6, 0.3)).toBeCloseTo(39.6, 5)
  })

  it('coverage meets or exceeds the target the frame count was computed for', () => {
    const frames = framesForArc(180, FOV_50FF.horizontal, 0.3)
    expect(arcCoverage(frames, FOV_50FF.horizontal, 0.3)).toBeGreaterThanOrEqual(180)
  })

  it('caps at 360', () => {
    expect(arcCoverage(100, 39.6, 0.3)).toBe(360)
  })

  it('returns 0 for zero frames', () => {
    expect(arcCoverage(0, 39.6, 0.3)).toBe(0)
  })
})

describe('stitchedMegapixels', () => {
  it('a single frame equals the camera resolution', () => {
    expect(stitchedMegapixels(24, 1, 1, 0.3, 'landscape')).toBeCloseTo(24, 0)
  })

  it('grows with frame count', () => {
    const one = stitchedMegapixels(24, 1, 1, 0.3, 'landscape')
    const five = stitchedMegapixels(24, 5, 1, 0.3, 'landscape')
    expect(five).toBeGreaterThan(one * 3)
  })

  it('portrait orientation yields the same MP for a symmetric grid', () => {
    const l = stitchedMegapixels(24, 3, 3, 0.3, 'landscape')
    const p = stitchedMegapixels(24, 3, 3, 0.3, 'portrait')
    expect(l).toBeCloseTo(p, 5)
  })
})

describe('planPanorama', () => {
  const base = {
    focalLength: 50,
    cropFactor: 1,
    orientation: 'landscape' as const,
    overlap: 0.3,
    targetHDeg: 180,
    rows: 1,
    megapixels: 45,
  }

  it('produces a consistent single-row plan', () => {
    const plan = planPanorama(base)
    expect(plan.framesPerRow).toBe(7)
    expect(plan.totalFrames).toBe(7)
    expect(plan.frameFovH).toBeCloseTo(FOV_50FF.horizontal, 5)
    expect(plan.coverageH).toBeGreaterThanOrEqual(180)
    expect(plan.stitchedMp).toBeGreaterThan(45)
  })

  it('portrait orientation swaps the frame FOV axes (more frames, taller coverage)', () => {
    const landscape = planPanorama(base)
    const portrait = planPanorama({ ...base, orientation: 'portrait' })
    expect(portrait.frameFovH).toBeCloseTo(landscape.frameFovV, 5)
    expect(portrait.framesPerRow).toBeGreaterThan(landscape.framesPerRow)
    expect(portrait.coverageV).toBeGreaterThan(landscape.coverageV)
  })

  it('multi-row plans multiply total frames and extend vertical coverage', () => {
    const plan = planPanorama({ ...base, rows: 3 })
    expect(plan.totalFrames).toBe(plan.framesPerRow * 3)
    expect(plan.coverageV).toBeGreaterThan(planPanorama(base).coverageV)
  })
})

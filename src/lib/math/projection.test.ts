import { describe, it, expect } from 'vitest'
import { frameHeightAtDistance, figureFraction, selectCropLevel, modelLayout, blurMmToPx } from './projection'

describe('projection', () => {
  it('frame height: 85mm on FF at 3m shows ~847mm of scene', () => {
    expect(frameHeightAtDistance(3, 85, 24)).toBeCloseTo(847.06, 1)
  })
  it('returns 0 for non-positive inputs', () => {
    expect(frameHeightAtDistance(0, 85, 24)).toBe(0)
    expect(frameHeightAtDistance(3, 0, 24)).toBe(0)
  })
  it('figure fraction: 1.70m person at 3m, 85mm FF fills ~2x frame', () => {
    expect(figureFraction(1.7, 3, 85, 24)).toBeCloseTo(2.007, 2)
  })
  it('crop level thresholds', () => {
    expect(selectCropLevel(0.9)).toBe('full')
    expect(selectCropLevel(2.0)).toBe('torso')
    expect(selectCropLevel(3.5)).toBe('face')
  })
  it('small figure stands on bottom edge', () => {
    expect(modelLayout(300, 400, 0.1)).toEqual({ heightPx: 300, topPx: 100 })
  })
  it('large figure anchors eye line at 38% viewport height', () => {
    const l = modelLayout(2000, 400, 0.12)
    expect(l.topPx).toBeCloseTo(400 * 0.38 - 2000 * 0.12, 5)
  })
  it('blur mm→px scales by frame width', () => {
    expect(blurMmToPx(0.36, 36, 1000)).toBeCloseTo(10, 5)
    expect(blurMmToPx(1, 0, 1000)).toBe(0)
  })
})

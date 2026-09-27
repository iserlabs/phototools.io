import { describe, it, expect } from 'vitest'
import {
  HARMONY_KEYS, TEMPLATE_HARMONIES, HUE_BAND_KEYS, NEUTRAL, NUDGE,
  SAMPLE_CAP, PATCH_SIZE, ANALYSIS_LONG_EDGE, CLUSTER, MONO_LIGHTNESS,
} from './colorAnalyzer'

describe('HARMONY_KEYS', () => {
  it('lists the seven harmony types with unique values and non-empty i18n keys', () => {
    expect(HARMONY_KEYS).toHaveLength(7)
    const values = HARMONY_KEYS.map((h) => h.value)
    expect(new Set(values).size).toBe(7)
    for (const v of ['complementary', 'analogous', 'triadic', 'split-complementary', 'tetradic', 'monochromatic', 'custom']) {
      expect(values).toContain(v)
    }
    for (const h of HARMONY_KEYS) expect(h.key).toBeTruthy()
  })

  it('TEMPLATE_HARMONIES is every harmony except custom', () => {
    expect(TEMPLATE_HARMONIES).toHaveLength(6)
    expect(TEMPLATE_HARMONIES).not.toContain('custom')
  })
})

describe('HUE_BAND_KEYS', () => {
  it('has 24 unique keys, one per 15°', () => {
    expect(HUE_BAND_KEYS).toHaveLength(24)
    expect(new Set(HUE_BAND_KEYS).size).toBe(24)
  })
  it('starts at red and has blue at 240°', () => {
    expect(HUE_BAND_KEYS[0]).toBe('red')
    expect(HUE_BAND_KEYS[240 / 15]).toBe('blue')
  })
})

describe('thresholds', () => {
  it('nudge bands are ordered', () => {
    expect(NUDGE.aligned).toBeLessThan(NUDGE.slight)
  })
  it('neutral thresholds match the spec', () => {
    expect(NEUTRAL).toEqual({ minSat: 8, minLight: 8, maxLight: 94 })
  })
  it('constants match the spec', () => {
    expect(SAMPLE_CAP).toBe(8)
    expect(PATCH_SIZE).toBe(5)
    expect(ANALYSIS_LONG_EDGE).toBe(1600)
    expect(CLUSTER.k).toBe(5)
    expect(CLUSTER.width).toBe(64)
    expect(CLUSTER.iterations).toBe(12)
    expect(MONO_LIGHTNESS).toEqual([20, 35, 50, 65, 80])
  })
})

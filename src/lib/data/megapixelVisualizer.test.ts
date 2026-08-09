import { describe, it, expect } from 'vitest'
import {
  MP_PRESETS, ALL_MP_ID_SET, DEFAULT_VISIBLE_MP_IDS,
  DPI_PRESETS,
  PHONE_BINNING, BIT_DEPTHS,
} from './megapixelVisualizer'

describe('MP_PRESETS', () => {
  it('contains at least 10 entries', () => {
    expect(MP_PRESETS.length).toBeGreaterThanOrEqual(10)
  })
  it('is sorted ascending by mp', () => {
    for (let i = 1; i < MP_PRESETS.length; i++) {
      expect(MP_PRESETS[i].mp).toBeGreaterThan(MP_PRESETS[i - 1].mp)
    }
  })
  it('all ids are unique', () => {
    const ids = MP_PRESETS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('all ids match mp_<N> format', () => {
    for (const p of MP_PRESETS) expect(p.id).toBe(`mp_${p.mp}`)
  })
  it('all have valid hex color', () => {
    for (const p of MP_PRESETS) expect(p.color).toMatch(/^#[0-9a-f]{6}$/i)
  })
  it('includes 12, 24, 45, 100 (defaults)', () => {
    const mps = MP_PRESETS.map(p => p.mp)
    expect(mps).toEqual(expect.arrayContaining([12, 24, 45, 100]))
  })
  it('models never include phone_mid/phone_uw category labels (not real cameras)', () => {
    // Regression: phone_mid/phone_uw's COMMON_MP entries name representative
    // categories ("Typical mid-range main sensor", "High-res ultra-wide
    // module"), not real product names. They must never leak into this
    // tool's `models` tooltip, which is captioned as a list of cameras.
    for (const p of MP_PRESETS) {
      if (p.models) expect(p.models).not.toMatch(/typical|high-res/i)
    }
  })
})

describe('DEFAULT_VISIBLE_MP_IDS', () => {
  it('all default ids exist in MP_PRESETS', () => {
    for (const id of DEFAULT_VISIBLE_MP_IDS) {
      expect(ALL_MP_ID_SET.has(id)).toBe(true)
    }
  })
})

describe('DPI_PRESETS', () => {
  it('contains 72, 150, 240, 300', () => {
    const values = DPI_PRESETS.map(d => d.value)
    expect(values).toEqual(expect.arrayContaining([72, 150, 240, 300]))
  })
})

describe('PHONE_BINNING', () => {
  it('48 → 12', () => { expect(PHONE_BINNING[48]).toBe(12) })
  it('200 → 12', () => { expect(PHONE_BINNING[200]).toBe(12) })
})

describe('BIT_DEPTHS', () => {
  it('contains jpeg8, raw14, tiff16', () => {
    const ids = BIT_DEPTHS.map(b => b.id)
    expect(ids).toEqual(expect.arrayContaining(['jpeg8', 'raw14', 'tiff16']))
  })
})

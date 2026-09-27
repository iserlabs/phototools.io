import { describe, it, expect } from 'vitest'
import { normalizeHue, hueBandIndex, hueBandKey, isNeutral, colorNameKey, directionBandKey } from './color-name'

describe('normalizeHue', () => {
  it('wraps negatives and values ≥ 360', () => {
    expect(normalizeHue(-10)).toBe(350)
    expect(normalizeHue(360)).toBe(0)
    expect(normalizeHue(725)).toBe(5)
  })
})

describe('hueBandIndex / hueBandKey', () => {
  it('centres bands on multiples of 15°', () => {
    expect(hueBandIndex(0)).toBe(0)
    expect(hueBandIndex(7.4)).toBe(0)
    expect(hueBandIndex(7.5)).toBe(1)
    expect(hueBandIndex(352.5)).toBe(0)   // wraps into red
    expect(hueBandIndex(352.4)).toBe(23)
    expect(hueBandKey(240)).toBe('blue')
    expect(hueBandKey(195)).toBe('sky-blue')
    expect(hueBandKey(211)).toBe('azure')
  })
})

describe('isNeutral', () => {
  it('flags low saturation, near-black and near-white', () => {
    expect(isNeutral({ s: 7, l: 50 })).toBe(true)
    expect(isNeutral({ s: 8, l: 50 })).toBe(false)
    expect(isNeutral({ s: 90, l: 7 })).toBe(true)
    expect(isNeutral({ s: 90, l: 95 })).toBe(true)
    expect(isNeutral({ s: 90, l: 94 })).toBe(false)
  })
})

describe('colorNameKey', () => {
  it('returns a neutral key for neutrals, else the band key', () => {
    expect(colorNameKey({ h: 200, s: 3, l: 50 })).toBe('gray')
    expect(colorNameKey({ h: 200, s: 50, l: 4 })).toBe('black')
    expect(colorNameKey({ h: 200, s: 50, l: 97 })).toBe('white')
    expect(colorNameKey({ h: 0, s: 94, l: 20 })).toBe('red')
  })
  it('black wins over gray when both apply', () => {
    expect(colorNameKey({ h: 0, s: 0, l: 0 })).toBe('black')
  })
})

describe('directionBandKey', () => {
  it('names the target band when it differs from the sample band', () => {
    expect(directionBandKey(0, 330, -30)).toBe('pink')
  })
  it('steps one band further in the direction of travel when both share a band', () => {
    // sample 238 and target 243 are both "blue"; delta +5 → name the next band clockwise
    expect(directionBandKey(238, 243, 5)).toBe('indigo')
    // delta −5 → previous band
    expect(directionBandKey(243, 238, -5)).toBe('cobalt')
  })
})

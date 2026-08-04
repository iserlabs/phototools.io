import { describe, it, expect } from 'vitest'
import { matchBrand, lifeVerdict, SHUTTER_RATINGS, CAMERA_BRANDS } from './shutterCount'

describe('matchBrand', () => {
  it('matches EXIF Make strings case-insensitively', () => {
    expect(matchBrand('NIKON CORPORATION')?.id).toBe('nikon')
    expect(matchBrand('Canon')?.id).toBe('canon')
    expect(matchBrand('SONY')?.id).toBe('sony')
    expect(matchBrand('FUJIFILM')?.id).toBe('fujifilm')
    expect(matchBrand('OM Digital Solutions')?.id).toBe('olympus')
    expect(matchBrand('RICOH IMAGING COMPANY, LTD.')?.id).toBe('pentax')
  })

  it('returns null for unknown or missing makes', () => {
    expect(matchBrand('Hasselblad')).toBeNull()
    expect(matchBrand(null)).toBeNull()
    expect(matchBrand(undefined)).toBeNull()
    expect(matchBrand('')).toBeNull()
  })

  it('every brand declares a support level and at least one match pattern', () => {
    for (const b of CAMERA_BRANDS) {
      expect(['supported', 'partial', 'unsupported']).toContain(b.support)
      expect(b.matches.length).toBeGreaterThan(0)
      expect(b.label).toBeTruthy()
    }
  })

  it('brand ids are unique', () => {
    const ids = CAMERA_BRANDS.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('only Nikon is fully supported — the others cannot be read from files', () => {
    // Guards the UI's honesty claim: Canon never writes the count, Sony encrypts it.
    const supported = CAMERA_BRANDS.filter((b) => b.support === 'supported').map((b) => b.id)
    expect(supported).toEqual(['nikon'])
    expect(CAMERA_BRANDS.find((b) => b.id === 'canon')?.support).toBe('unsupported')
    expect(CAMERA_BRANDS.find((b) => b.id === 'sony')?.support).toBe('unsupported')
  })
})

describe('lifeVerdict', () => {
  it('maps life-used fractions to verdict bands', () => {
    expect(lifeVerdict(0)).toBe('low')
    expect(lifeVerdict(0.1)).toBe('low')
    expect(lifeVerdict(0.5)).toBe('moderate')
    expect(lifeVerdict(0.9)).toBe('high')
    expect(lifeVerdict(1.4)).toBe('beyond')
  })

  it('band boundaries are exclusive on the low side', () => {
    expect(lifeVerdict(0.3)).toBe('moderate')
    expect(lifeVerdict(0.7)).toBe('high')
    expect(lifeVerdict(1)).toBe('high')
    expect(lifeVerdict(1.0001)).toBe('beyond')
  })
})

describe('SHUTTER_RATINGS', () => {
  it('are sorted ascending with unique ids', () => {
    const counts = SHUTTER_RATINGS.map((r) => r.count)
    expect([...counts].sort((a, b) => a - b)).toEqual(counts)
    expect(new Set(SHUTTER_RATINGS.map((r) => r.id)).size).toBe(SHUTTER_RATINGS.length)
  })

  it('cover the realistic range of published shutter ratings', () => {
    expect(SHUTTER_RATINGS[0].count).toBe(100_000)
    expect(SHUTTER_RATINGS[SHUTTER_RATINGS.length - 1].count).toBe(500_000)
  })
})

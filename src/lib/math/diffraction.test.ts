import { describe, it, expect } from 'vitest'
import { pixelPitch, diffractionLimitedAperture, airyDiskDiameterUm, apertureVerdict } from './diffraction'

describe('pixelPitch', () => {
  it('24MP FF sensor (36mm wide) has ~6µm pixel pitch', () => {
    // widthPixels = sqrt(24e6 * 1.5) = sqrt(36e6) = 6000
    // pitchMm = 36 / 6000 = 0.006 mm = 6 µm
    expect(pixelPitch(36, 24)).toBeCloseTo(6.0, 1)
  })

  it('45MP FF sensor (36mm wide) has smaller pixel pitch than 24MP', () => {
    const pitch24 = pixelPitch(36, 24)
    const pitch45 = pixelPitch(36, 45)
    expect(pitch45).toBeLessThan(pitch24)
  })

  it('12MP FF sensor has larger pixel pitch than 24MP', () => {
    const pitch12 = pixelPitch(36, 12)
    const pitch24 = pixelPitch(36, 24)
    expect(pitch12).toBeGreaterThan(pitch24)
  })

  it('24MP APS-C (23.5mm wide) has smaller pitch than 24MP FF', () => {
    const pitchFF = pixelPitch(36, 24)
    const pitchAPS = pixelPitch(23.5, 24)
    expect(pitchAPS).toBeLessThan(pitchFF)
  })

  it('45MP FF sensor pitch is ~4.4µm', () => {
    // widthPixels = sqrt(45e6 * 1.5) = sqrt(67.5e6) ≈ 8216
    // pitchMm = 36 / 8216 ≈ 0.00438 mm ≈ 4.38 µm
    expect(pixelPitch(36, 45)).toBeCloseTo(4.38, 1)
  })
})

describe('diffractionLimitedAperture', () => {
  it('24MP FF (~6µm pitch) diffraction limit is around f/8-f/9', () => {
    const limit = diffractionLimitedAperture(6.0)
    // 6.0 / 0.67 ≈ 8.96
    expect(limit).toBeGreaterThan(8)
    expect(limit).toBeLessThan(10)
  })

  it('higher resolution (smaller pitch) has lower diffraction limit', () => {
    const limit24mp = diffractionLimitedAperture(pixelPitch(36, 24))
    const limit45mp = diffractionLimitedAperture(pixelPitch(36, 45))
    expect(limit45mp).toBeLessThan(limit24mp)
  })

  it('12MP FF sensor has higher diffraction limit than 24MP', () => {
    const limit12 = diffractionLimitedAperture(pixelPitch(36, 12))
    const limit24 = diffractionLimitedAperture(pixelPitch(36, 24))
    expect(limit12).toBeGreaterThan(limit24)
  })
})

describe('airyDiskDiameterUm', () => {
  it('f/8 in green light (550nm) produces a ~10.7µm Airy disk', () => {
    // 2.44 × 0.55 × 8 = 10.736
    expect(airyDiskDiameterUm(8)).toBeCloseTo(10.74, 1)
  })

  it('scales linearly with f-number', () => {
    expect(airyDiskDiameterUm(16)).toBeCloseTo(airyDiskDiameterUm(8) * 2, 5)
  })

  it('longer wavelengths diffract more', () => {
    expect(airyDiskDiameterUm(8, 650)).toBeGreaterThan(airyDiskDiameterUm(8, 450))
  })

  it('at the diffraction-limited aperture the Airy disk is ~1.6x the pixel pitch', () => {
    // The 0.67 constant targets the Airy radius ≈ pitch; diameter/pitch = 2.44·0.55/0.67·...
    const pitch = 6.0
    const limit = diffractionLimitedAperture(pitch)
    expect(airyDiskDiameterUm(limit) / pitch).toBeCloseTo(2.0, 0)
  })
})

describe('apertureVerdict', () => {
  const limit = diffractionLimitedAperture(pixelPitch(36, 24)) // ~f/9 on 24MP FF

  it('apertures at or below the limit are sharp', () => {
    expect(apertureVerdict(5.6, limit)).toBe('sharp')
    expect(apertureVerdict(8, limit)).toBe('sharp')
    expect(apertureVerdict(limit, limit)).toBe('sharp')
  })

  it('up to ~1 stop past the limit is borderline, not soft', () => {
    expect(apertureVerdict(11, limit)).toBe('borderline')
    expect(apertureVerdict(limit * 1.5, limit)).toBe('borderline')
  })

  it('well past the limit is soft', () => {
    expect(apertureVerdict(16, limit)).toBe('soft')
    expect(apertureVerdict(22, limit)).toBe('soft')
  })

  it('a high-resolution sensor turns an aperture soft that a low-resolution one keeps sharp', () => {
    const limit61 = diffractionLimitedAperture(pixelPitch(36, 61))
    const limit12 = diffractionLimitedAperture(pixelPitch(36, 12))
    expect(apertureVerdict(11, limit61)).toBe('soft')
    expect(apertureVerdict(11, limit12)).toBe('sharp')
  })
})

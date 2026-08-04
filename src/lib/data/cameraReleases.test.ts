import { describe, it, expect } from 'vitest'
import { CAMERA_RELEASES, findCameraRelease } from './cameraReleases'

describe('CAMERA_RELEASES data shape', () => {
  it('every entry has a model, plausible year, and at least one match pattern', () => {
    for (const c of CAMERA_RELEASES) {
      expect(c.model).toBeTruthy()
      expect(c.year).toBeGreaterThanOrEqual(2010)
      expect(c.year).toBeLessThanOrEqual(2026)
      expect(c.matches.length).toBeGreaterThan(0)
      if (c.ratedActuations !== undefined) {
        expect(c.ratedActuations).toBeGreaterThanOrEqual(50_000)
      }
    }
  })

  it('model names are unique', () => {
    const names = CAMERA_RELEASES.map((c) => c.model)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('findCameraRelease — real EXIF Model strings', () => {
  const cases: Array<[string, string]> = [
    ['NIKON Z 8', 'Nikon Z8'],
    ['NIKON Z 9', 'Nikon Z9'],
    ['NIKON Z 6_2', 'Nikon Z6 II'],
    ['NIKON Z 7_2', 'Nikon Z7 II'],
    ['NIKON Z6_3', 'Nikon Z6 III'],
    ['NIKON Z 50', 'Nikon Z50'],   // must NOT match Z5
    ['NIKON Z 5', 'Nikon Z5'],
    ['NIKON Z fc', 'Nikon Zfc'],   // must NOT match Zf
    ['NIKON Z f', 'Nikon Zf'],
    ['NIKON D7500', 'Nikon D7500'], // must NOT match D750
    ['NIKON D750', 'Nikon D750'],
    ['Canon EOS R5', 'Canon EOS R5'],
    ['Canon EOS R5m2', 'Canon EOS R5 Mark II'],
    ['Canon EOS 5D Mark IV', 'Canon EOS 5D Mark IV'],
    ['ILCE-7M4', 'Sony A7 IV'],
    ['ILCE-7RM5', 'Sony A7R V'],
    ['ILCE-1', 'Sony A1'],
    ['X-T5', 'Fujifilm X-T5'],
    ['X100VI', 'Fujifilm X100VI'],
    ['X100V', 'Fujifilm X100V'],
    ['OM-1', 'OM System OM-1'],
  ]

  for (const [exifModel, expected] of cases) {
    it(`${exifModel} → ${expected}`, () => {
      expect(findCameraRelease(exifModel)?.model).toBe(expected)
    })
  }

  it('returns null for unknown or empty models', () => {
    expect(findCameraRelease('Unknown Camera 3000')).toBeNull()
    expect(findCameraRelease('')).toBeNull()
    expect(findCameraRelease(null)).toBeNull()
  })
})

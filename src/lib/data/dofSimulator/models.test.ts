import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { DOF_SUBJECTS, getSubjectById } from './models'

const PUB = join(process.cwd(), 'public')

describe('subject manifests', () => {
  it('has 8 subjects with unique ids and sane heights', () => {
    expect(DOF_SUBJECTS).toHaveLength(8)
    expect(new Set(DOF_SUBJECTS.map((s) => s.id)).size).toBe(8)
    for (const s of DOF_SUBJECTS) {
      expect(s.heightM).toBeGreaterThanOrEqual(0.9)
      expect(s.heightM).toBeLessThanOrEqual(2.0)
    }
  })
  it('every asset file exists on disk', () => {
    for (const s of DOF_SUBJECTS) {
      for (const level of ['full', 'torso', 'face'] as const) {
        const crop = s.crops[level]
        expect(existsSync(join(PUB, crop.src)), crop.src).toBe(true)
        expect(crop.eyeLineRatio).toBeGreaterThan(0)
        expect(crop.eyeLineRatio).toBeLessThan(1)
        for (const slice of crop.slices) expect(existsSync(join(PUB, slice.src)), slice.src).toBe(true)
      }
    }
  })
  it('slice depth offsets are ordered near→far', () => {
    for (const s of DOF_SUBJECTS) {
      const offsets = s.crops.face.slices.map((x) => x.depthOffsetMm)
      expect(offsets).toEqual([...offsets].sort((a, b) => a - b))
    }
  })
  it('falls back to the first subject', () => {
    expect(getSubjectById('nope').id).toBe(DOF_SUBJECTS[0].id)
  })
})

import { describe, it, expect } from 'vitest'
import { computeExportLayout } from './exportLayout'
import { getSubjectById } from '@/lib/data/dofSimulator/models'

const subject = getSubjectById('woman-a')
const derived = { figureFrac: 4, cropLevel: 'face' as const, sensorWMm: 36 }
const optics = { focalLength: 135, aperture: 1.4, distanceM: 1.2 }
const viewportPx = { w: 900, h: 600 }

describe('computeExportLayout', () => {
  it('doubles canvas + caption dimensions at scale 2', () => {
    const l1 = computeExportLayout(viewportPx, subject, derived, optics, 1)
    const l2 = computeExportLayout(viewportPx, subject, derived, optics, 2)
    expect(l2.canvasW).toBeCloseTo(l1.canvasW * 2, 5)
    expect(l2.canvasH).toBeCloseTo(l1.canvasH * 2, 5)
    expect(l2.captionH).toBeCloseTo(l1.captionH * 2, 5)
  })

  it('caption height is 48 * scale', () => {
    expect(computeExportLayout(viewportPx, subject, derived, optics, 1).captionH).toBe(48)
    expect(computeExportLayout(viewportPx, subject, derived, optics, 2).captionH).toBe(96)
    expect(computeExportLayout(viewportPx, subject, derived, optics, 3).captionH).toBe(144)
  })

  it('slice count and src order matches the active crop level', () => {
    const l = computeExportLayout(viewportPx, subject, derived, optics, 2)
    expect(l.slices).toHaveLength(subject.crops.face.slices.length)
    expect(l.slices.map((s) => s.src)).toEqual(subject.crops.face.slices.map((s) => s.src))
  })

  it('respects other crop levels too (torso)', () => {
    const torsoDerived = { ...derived, cropLevel: 'torso' as const }
    const l = computeExportLayout(viewportPx, subject, torsoDerived, optics, 2)
    expect(l.slices).toHaveLength(subject.crops.torso.slices.length)
  })

  it('per-slice geometry scales linearly with scale', () => {
    const l1 = computeExportLayout(viewportPx, subject, derived, optics, 1)
    const l2 = computeExportLayout(viewportPx, subject, derived, optics, 2)
    l1.slices.forEach((s1, i) => {
      const s2 = l2.slices[i]
      expect(s2.y).toBeCloseTo(s1.y * 2, 5)
      expect(s2.h).toBeCloseTo(s1.h * 2, 5)
      expect(s2.w).toBeCloseTo(s1.w * 2, 5)
    })
  })

  it('mirrors ModelLayer blur semantics: eye-plane slice unblurred, off-plane slices blurred', () => {
    const l = computeExportLayout(viewportPx, subject, derived, optics, 1)
    // face crop slices are ordered near -> mid (0 offset) -> far
    expect(l.slices[1].blurPx).toBe(0)
    expect(l.slices[0].blurPx).toBeGreaterThan(0)
    expect(l.slices[2].blurPx).toBeGreaterThan(0)
  })

  it('caps blur at MAX_BLUR_PX * scale', () => {
    const wideOptics = { focalLength: 400, aperture: 1.0, distanceM: 1.2 }
    const l = computeExportLayout(viewportPx, subject, derived, wideOptics, 2)
    for (const s of l.slices) expect(s.blurPx).toBeLessThanOrEqual(24 * 2)
  })
})

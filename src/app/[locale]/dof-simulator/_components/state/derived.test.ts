import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { computeDerived } from './useDofDerived'
import { useDofState } from './useDofState'
import { getSubjectById } from '@/lib/data/dofSimulator/models'
import { getBackgroundById } from '@/lib/data/dofSimulator/backgrounds'

const base = {
  optics: {
    focalLength: 85, aperture: 2.8, distanceM: 3, sensorId: 'ff', cameraId: null, lensId: null,
    teleconverterId: 'none' as const, customCocMm: null, backgroundDistanceM: null,
  },
  subject: getSubjectById('woman-a'), background: getBackgroundById('city-skyline'),
  orientation: 'landscape' as const, bokeh: 'disc' as const,
}

describe('computeDerived', () => {
  it('orientation swaps sensor dimensions', () => {
    expect(computeDerived(base).sensorHMm).toBe(24)
    expect(computeDerived({ ...base, orientation: 'portrait' }).sensorHMm).toBe(36)
  })
  it('teleconverter multiplies effective FL', () => {
    const d = computeDerived({ ...base, optics: { ...base.optics, teleconverterId: 'tc20' } })
    expect(d.effectiveFl).toBe(170)
  })
  it('custom CoC overrides the sensor-derived value', () => {
    const d = computeDerived({ ...base, optics: { ...base.optics, customCocMm: 0.05 } })
    expect(d.cocMm).toBe(0.05)
  })
  it('DOF split percentages sum to 100', () => {
    const d = computeDerived(base)
    expect(d.inFrontPct).toBeGreaterThan(0)
    expect(d.inFrontPct).toBeLessThan(100)
    expect(d.inFrontM + d.behindM).toBeCloseTo(d.dof.totalDoF, 3)
  })
  it('equivalent is null on FF and populated on crop', () => {
    expect(computeDerived(base).equivalent).toBeNull()
    const d = computeDerived({ ...base, optics: { ...base.optics, sensorId: 'apsc_n' } })
    expect(d.equivalent).not.toBeNull()
  })
  it('flags focus closer than the lens MFD', () => {
    const d = computeDerived({ ...base, optics: { ...base.optics, lensId: 'nikkor-z-85mm-f1-8-s', distanceM: 0.5 } })
    expect(d.belowMinFocus).toBe(true)
  })
})

describe('useDofState facade — framing', () => {
  it("applyFramingPreset('face') at fl=85/FF solves distance ~= 1.133m", () => {
    const { result } = renderHook(() => useDofState())
    act(() => {
      result.current.applyFramingPreset('face')
    })
    expect(result.current.optics.distanceM).toBeCloseTo(1.133, 3)
    expect(result.current.framing.activePreset).toBe('face')
    expect(result.current.framing.lockedFrameHeightMm).toBe(320)
  })

  it('lock-FOV re-solves distance when focal length changes (85mm -> 170mm doubles distance ~= 2.267m)', () => {
    const { result } = renderHook(() => useDofState())
    act(() => {
      result.current.applyFramingPreset('face')
      result.current.framing.setLockFov(true)
    })
    expect(result.current.optics.distanceM).toBeCloseTo(1.133, 3)

    act(() => {
      result.current.changeFocalLength(170)
    })
    expect(result.current.optics.focalLength).toBe(170)
    expect(result.current.optics.distanceM).toBeCloseTo(2.267, 3)
  })
})

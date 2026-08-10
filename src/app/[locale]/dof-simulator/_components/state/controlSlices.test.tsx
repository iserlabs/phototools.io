import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOptics } from './useOptics'
import { useFraming } from './useFraming'
import { useUiPrefs } from './useUiPrefs'

describe('useOptics', () => {
  it('has spec defaults', () => {
    const { result } = renderHook(() => useOptics())
    expect(result.current.focalLength).toBe(85)
    expect(result.current.aperture).toBe(2.8)
    expect(result.current.distanceM).toBe(3)
    expect(result.current.sensorId).toBe('ff')
  })
  it('selecting a camera adopts its sensor', () => {
    const { result } = renderHook(() => useOptics())
    act(() => result.current.setCameraId('nikon-z50-ii'))
    expect(result.current.sensorId).toBe('apsc_n')
  })
  it('selecting a lens clamps FL and aperture into its envelope', () => {
    const { result } = renderHook(() => useOptics())
    act(() => result.current.setAperture(1.2))
    act(() => result.current.setLensId('nikkor-z-dx-16-50mm-f3-5-6-3'))
    expect(result.current.focalLength).toBe(50) // 85 clamped to flMax
    expect(result.current.aperture).toBeGreaterThanOrEqual(6.3)
  })

  // B3: the aperture envelope used to be enforced only in LensPanel's slider
  // display (Math.max for the shown position) -- the underlying state could
  // still hold an out-of-envelope aperture whenever anything else wrote it
  // directly (setAperture called by useApertureSweep/useQueryInit/reset()/
  // saved-settings apply, or a focal-length/teleconverter change narrowing
  // the envelope after the fact). Enforcing the clamp in useOptics itself
  // means every one of those call sites is fixed by construction.
  describe('aperture envelope (B3)', () => {
    it('setAperture floors directly at the attached lens max aperture, bypassing the view layer entirely', () => {
      const { result } = renderHook(() => useOptics())
      act(() => result.current.setLensId('nikkor-z-50mm-f1-8-s')) // prime, apMaxWide = apMaxTele = 1.8
      act(() => result.current.setAperture(1.0)) // wider than the lens allows
      expect(result.current.aperture).toBe(1.8)
    })

    it('attaching a teleconverter narrows the envelope and re-clamps the current aperture', () => {
      const { result } = renderHook(() => useOptics())
      act(() => result.current.setLensId('nikkor-z-50mm-f1-8-s'))
      act(() => result.current.setAperture(1.8))
      act(() => result.current.setTeleconverterId('tc20')) // 2x -> effective max aperture 3.6
      expect(result.current.aperture).toBeCloseTo(3.6, 5)
    })

    it('zooming toward the tele end of a variable-aperture lens re-clamps aperture without touching the aperture control', () => {
      const { result } = renderHook(() => useOptics())
      act(() => result.current.setLensId('nikkor-z-dx-16-50mm-f3-5-6-3')) // apMaxWide 3.5 @16mm, apMaxTele 6.3 @50mm
      act(() => result.current.setFocalLength(16))
      act(() => result.current.setAperture(3.5))
      expect(result.current.aperture).toBeCloseTo(3.5, 5)
      act(() => result.current.setFocalLength(50))
      expect(result.current.aperture).toBeCloseTo(6.3, 5)
    })

    it('setAperture is unconstrained with no lens attached', () => {
      const { result } = renderHook(() => useOptics())
      act(() => result.current.setAperture(0.95))
      expect(result.current.aperture).toBe(0.95)
    })
  })
})

describe('useFraming', () => {
  it('starts unlocked with no preset', () => {
    const { result } = renderHook(() => useFraming())
    expect(result.current.activePreset).toBeNull()
    expect(result.current.lockFov).toBe(false)
  })
})

describe('useUiPrefs', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults are false/false when storage is empty', () => {
    const { result } = renderHook(() => useUiPrefs())
    expect(result.current.advanced).toBe(false)
    expect(result.current.imperial).toBe(false)
  })

  it('a saved value is adopted after mount (effect)', async () => {
    // Pre-populate storage with advanced: true
    const stored = { advanced: true, imperial: false }
    localStorage.setItem('phototools.dof.uiprefs.v1', JSON.stringify(stored))

    const { result } = renderHook(() => useUiPrefs())

    // After effect runs: storage value adopted
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.advanced).toBe(true)
    expect(result.current.imperial).toBe(false)
  })

  it('corrupted JSON in storage falls back to defaults without throwing', async () => {
    localStorage.setItem('phototools.dof.uiprefs.v1', 'not valid json')

    const { result } = renderHook(() => useUiPrefs())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.advanced).toBe(false)
    expect(result.current.imperial).toBe(false)
  })

  it('setAdvanced(true) persists to localStorage', async () => {
    const { result } = renderHook(() => useUiPrefs())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    act(() => {
      result.current.setAdvanced(true)
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const stored = localStorage.getItem('phototools.dof.uiprefs.v1')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed.advanced).toBe(true)
    expect(parsed.imperial).toBe(false)
  })
})

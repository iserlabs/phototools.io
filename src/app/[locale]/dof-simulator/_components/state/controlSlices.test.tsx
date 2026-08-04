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

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOptics } from './useOptics'
import { useFraming } from './useFraming'

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

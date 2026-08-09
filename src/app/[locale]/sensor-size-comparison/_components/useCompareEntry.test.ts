import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCompareEntry } from './useCompareEntry'
import type { ResolvedSensor } from './sensorSizeTypes'

const ff: ResolvedSensor = { id: 'ff', name: 'Full Frame', w: 36, h: 24, cropFactor: 1, color: '#3b82f6', group: 'ff-aps' }
const apscN: ResolvedSensor = { id: 'apsc_n', name: 'APS-C (1.5x)', w: 23.5, h: 15.6, cropFactor: 1.53, color: '#10b981', group: 'ff-aps' }
const allSensors = [ff, apscN]

// jsdom doesn't implement matchMedia at all, so it must be assigned (not
// spied on) before it can be mocked — same approach as useSensorCanvas.test.ts.
function stubMatchMedia(initialMatches: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>()
  const mql = {
    matches: initialMatches,
    media: '(min-width: 1024px)',
    addEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb)),
    removeEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb)),
  }
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia
  const fireChange = (matches: boolean) => {
    mql.matches = matches
    for (const cb of listeners) cb({ matches } as MediaQueryListEvent)
  }
  return { mql, fireChange }
}

describe('useCompareEntry', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves compareA/compareB from comparePair when both ids are known', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() =>
      useCompareEntry({ allSensors, comparePair: ['ff', 'apsc_n'], setComparePair: vi.fn(), trackParam: vi.fn() }),
    )
    expect(result.current.compareA?.id).toBe('ff')
    expect(result.current.compareB?.id).toBe('apsc_n')
  })

  it('resolves both sides undefined when comparePair is null', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() =>
      useCompareEntry({ allSensors, comparePair: null, setComparePair: vi.fn(), trackParam: vi.fn() }),
    )
    expect(result.current.compareA).toBeUndefined()
    expect(result.current.compareB).toBeUndefined()
  })

  it('tolerates a stale id (e.g. a deleted custom sensor) by leaving that side unresolved', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() =>
      useCompareEntry({ allSensors, comparePair: ['ff', 'custom_deleted'], setComparePair: vi.fn(), trackParam: vi.fn() }),
    )
    expect(result.current.compareA?.id).toBe('ff')
    expect(result.current.compareB).toBeUndefined()
  })

  it('reads the desktop breakpoint on mount and updates it when the viewport crosses it', () => {
    const { fireChange } = stubMatchMedia(false)
    const { result } = renderHook(() =>
      useCompareEntry({ allSensors, comparePair: null, setComparePair: vi.fn(), trackParam: vi.fn() }),
    )
    expect(result.current.isDesktop).toBe(false)
    act(() => fireChange(true))
    expect(result.current.isDesktop).toBe(true)
  })

  it('handleCompare tracks the pair and sets it as an ordered tuple', () => {
    stubMatchMedia(true)
    const setComparePair = vi.fn()
    const trackParam = vi.fn()
    const { result } = renderHook(() =>
      useCompareEntry({ allSensors, comparePair: null, setComparePair, trackParam }),
    )
    act(() => result.current.handleCompare('ff', 'apsc_n'))
    expect(setComparePair).toHaveBeenCalledWith(['ff', 'apsc_n'])
    expect(trackParam).toHaveBeenCalledWith({ param_name: 'compare', param_value: 'ff,apsc_n', input_type: 'select' })
  })
})

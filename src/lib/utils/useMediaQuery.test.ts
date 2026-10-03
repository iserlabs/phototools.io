import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaQuery } from './useMediaQuery'

function installMatchMedia(initial: boolean) {
  let matches = initial
  const listeners = new Set<() => void>()
  const mql = {
    get matches() { return matches },
    addEventListener: vi.fn((_: string, cb: () => void) => listeners.add(cb)),
    removeEventListener: vi.fn((_: string, cb: () => void) => listeners.delete(cb)),
  }
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia
  return {
    mql,
    flip(next: boolean) { matches = next; listeners.forEach((cb) => cb()) },
  }
}

describe('useMediaQuery', () => {
  const original = window.matchMedia
  afterEach(() => { window.matchMedia = original })

  it('returns the current match and re-renders when the query flips', () => {
    const mm = installMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery('(max-width: 1023px)'))
    expect(result.current).toBe(true)
    act(() => mm.flip(false))
    expect(result.current).toBe(false)
  })

  it('unsubscribes on unmount', () => {
    const mm = installMatchMedia(false)
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 1023px)'))
    unmount()
    expect(mm.mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('falls back to serverValue when matchMedia is unavailable', () => {
    // Simulate an environment without matchMedia (e.g. plain jsdom).
    Object.defineProperty(window, 'matchMedia', { value: undefined, configurable: true, writable: true })
    const { result } = renderHook(() => useMediaQuery('(max-width: 1023px)', true))
    expect(result.current).toBe(true)
  })
})

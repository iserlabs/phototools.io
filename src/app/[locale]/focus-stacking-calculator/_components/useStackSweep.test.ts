import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStackSweep } from './useStackSweep'

// jsdom doesn't implement matchMedia; stub it per-test so the hook's
// reduced-motion check has something to read.
function mockMatchMedia(reducedMotion: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reducedMotion,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

describe('useStackSweep', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockMatchMedia(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('(a) reduced motion short-circuits: no interval runs and playing returns to false', () => {
    mockMatchMedia(true)
    const setHovered = vi.fn()
    const { result } = renderHook(() => useStackSweep(8, setHovered))

    act(() => { result.current.toggle() })
    expect(result.current.playing).toBe(false)

    act(() => { vi.advanceTimersByTime(10_000) })
    expect(setHovered).not.toHaveBeenCalled()
  })

  it('(b) a normal sweep advances through every index and terminates with the highlight cleared', () => {
    const setHovered = vi.fn()
    const { result } = renderHook(() => useStackSweep(8, setHovered))

    act(() => { result.current.toggle() })
    expect(result.current.playing).toBe(true)

    act(() => { vi.advanceTimersByTime(10_000) })

    expect(result.current.playing).toBe(false)
    expect(setHovered).toHaveBeenLastCalledWith(null)
    const visited = setHovered.mock.calls.map(([i]) => i).filter((i) => i !== null)
    expect(visited).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('(c) unmounting mid-sweep clears the interval — no calls after unmount', () => {
    const setHovered = vi.fn()
    const { result, unmount } = renderHook(() => useStackSweep(8, setHovered))

    act(() => { result.current.toggle() })
    act(() => { vi.advanceTimersByTime(1000) }) // a couple of ticks in, well short of done

    const callsBeforeUnmount = setHovered.mock.calls.length
    expect(callsBeforeUnmount).toBeGreaterThan(0)

    unmount()
    act(() => { vi.advanceTimersByTime(10_000) })
    expect(setHovered.mock.calls.length).toBe(callsBeforeUnmount)
  })

  // Pins the fix for the brief's own contradiction: the old
  // `Math.min(250, Math.max(40, 4000 / count))` formula floors the interval
  // at 40ms once count > 100, so 300 shots took count * 40ms ≈ 12s to finish
  // — nowhere near the promised ~4s. The bounded-steps formula caps the
  // number of sweep steps at MAX_STEPS so total duration stays ~4s for any
  // count. Confirmed by hand against the pre-fix hook: with the old formula
  // this same assertion (settled well before 4.2s) fails for count=300,
  // since playing is still true at that point (it needs ~12s).
  it('(d) a large count still completes within ~4s of timer advancement, not count * 40ms', () => {
    const setHovered = vi.fn()
    const { result } = renderHook(() => useStackSweep(300, setHovered))

    act(() => { result.current.toggle() })
    act(() => { vi.advanceTimersByTime(4200) })

    expect(result.current.playing).toBe(false)
    expect(setHovered).toHaveBeenLastCalledWith(null)
  })
})

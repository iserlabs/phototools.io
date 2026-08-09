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

  // The ~4s figure is a ceiling, not a target — a 1-shot stack shouldn't be
  // artificially stretched to fill the full window. macroShots() genuinely
  // returns a count of 1 whenever subjectDepthMm <= sliceDofMm, so this is a
  // reachable real-world case, not just an edge case. Confirmed by hand
  // against the interim (pre-this-fix) hook, which derived the interval as
  // `4000 / steps` with no ceiling clamp: for count=1 that's a bare 4000ms
  // interval and an 8s total (two ticks including termination) — this same
  // "well under 4.2s" assertion failed there (playing was still true).
  it('(e) a count of 1 completes quickly rather than stretching to fill the ~4s budget', () => {
    const setHovered = vi.fn()
    const { result } = renderHook(() => useStackSweep(1, setHovered))

    act(() => { result.current.toggle() })
    // 2 ticks at 250ms (1 shot + termination) land at 500ms; stop short of
    // the next tick (750ms) for the same reason as test (f) below.
    act(() => { vi.advanceTimersByTime(600) })

    expect(result.current.playing).toBe(false)
    expect(setHovered.mock.calls.map(([i]) => i)).toEqual([0, null])
  })

  it('(f) a small count (4) completes well under the ~4.2s ceiling', () => {
    const setHovered = vi.fn()
    const { result } = renderHook(() => useStackSweep(4, setHovered))

    act(() => { result.current.toggle() })
    // 5 ticks at 250ms (4 shots + termination) land at 1250ms; stop the
    // advance short of the next tick (1500ms) so a still-registered
    // interval firing once more before React flushes the cleanup effect
    // doesn't record a spurious extra `null` call.
    act(() => { vi.advanceTimersByTime(1300) })

    expect(result.current.playing).toBe(false)
    expect(setHovered.mock.calls.map(([i]) => i)).toEqual([0, 1, 2, 3, null])
  })
})

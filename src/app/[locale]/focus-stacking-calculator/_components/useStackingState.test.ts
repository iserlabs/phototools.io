import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStackingState } from './useStackingState'

// Isolate the hook from real analytics dispatch/timers — irrelevant here and
// mirrors the mocking pattern used by useToolSession.test.ts.
vi.mock('@/lib/analytics/hooks/useToolSession', () => ({
  useToolSession: () => ({ trackParam: vi.fn() }),
}))

function isValid(state: { nearLimit: number; farLimit: number; stackingResult: { totalDepth: number } }) {
  const rangeOk = state.farLimit === Infinity || state.nearLimit <= state.farLimit
  const depthOk = !isFinite(state.stackingResult.totalDepth) || state.stackingResult.totalDepth >= 0
  return rangeOk && depthOk
}

describe('useStackingState — near/far invariant', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/en/focus-stacking-calculator')
  })

  it('(a) a focal-length raise crossing a finite far limit keeps near <= far and totalDepth >= 0', () => {
    const { result } = renderHook(() => useStackingState())

    // pull farLimit down to the current nearLimit, then crank focal length
    // up so the physical near floor rises past it in one call
    act(() => { result.current.onFarLimitChange(0.5) })
    act(() => { result.current.onFocalLengthChange(800) })

    expect(isValid(result.current)).toBe(true)
    expect(result.current.nearLimit).toBeLessThanOrEqual(result.current.farLimit)
    expect(result.current.stackingResult.totalDepth).toBeGreaterThanOrEqual(0)
  })

  it('(b) an inverted pair arriving via the query-init path converges to a valid pair', () => {
    window.history.pushState({}, '', '/en/focus-stacking-calculator?near=80&far=10')
    const { result } = renderHook(() => useStackingState())

    expect(isValid(result.current)).toBe(true)
    expect(result.current.nearLimit).toBeLessThanOrEqual(result.current.farLimit)
    expect(result.current.stackingResult.totalDepth).toBeGreaterThanOrEqual(0)
  })

  it('(c) an infinite far limit is never replaced by a finite value', () => {
    const { result } = renderHook(() => useStackingState())

    act(() => { result.current.onFarLimitChange(Infinity) })
    expect(result.current.farLimit).toBe(Infinity)

    act(() => { result.current.onNearLimitChange(1000) })
    expect(result.current.farLimit).toBe(Infinity)
  })
})

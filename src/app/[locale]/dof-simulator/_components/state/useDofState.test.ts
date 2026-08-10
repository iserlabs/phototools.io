import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDofState } from './useDofState'

// B2: Set-B focal-length/distance edits used to call ab.b.setFocalLength /
// ab.b.setDistanceM directly, bypassing the lens-envelope clamp, the
// canonical DIST_BOUNDS clamp, and lock-FOV re-solving that set A's
// changeFocalLength/changeDistance apply. changeFocalLengthB/changeDistanceB
// route B through the exact same framingActions.ts functions (just applied
// to ab.b instead of optics), so this proves the clamp actually fires for B
// and that it never mutates set A.
describe('useDofState B-side actions (B2)', () => {
  it('changeFocalLengthB clamps to the FL envelope and writes ab.b only', () => {
    const { result } = renderHook(() => useDofState())
    act(() => {
      result.current.changeFocalLengthB(5000) // past the unbounded FL_BOUNDS max (1200)
    })
    expect(result.current.ab.b.focalLength).toBe(1200)
    expect(result.current.optics.focalLength).toBe(85) // set A untouched
  })

  it('changeDistanceB clamps to the canonical distance domain and writes ab.b only', () => {
    const { result } = renderHook(() => useDofState())
    act(() => {
      result.current.changeDistanceB(9999)
    })
    expect(result.current.ab.b.distanceM).toBe(100) // canonical DIST_MAX
    expect(result.current.optics.distanceM).toBe(3) // set A untouched, spec default
  })

  it('changeFocalLengthB reports clamped:true when the value was out of range', () => {
    const { result } = renderHook(() => useDofState())
    let outcome: { clamped: boolean } | undefined
    act(() => {
      outcome = result.current.changeFocalLengthB(5000)
    })
    expect(outcome?.clamped).toBe(true)
  })

  it('changeDistanceB re-solves ab.b focal length against B\'s own sensor height when lock-FOV is on', () => {
    const { result } = renderHook(() => useDofState())
    act(() => {
      result.current.framing.setLockFov(true)
      result.current.framing.setLockedFrameHeightMm(1000) // arbitrary target frame height
    })
    const bFlBefore = result.current.ab.b.focalLength
    act(() => {
      result.current.changeDistanceB(10)
    })
    // Lock-FOV re-solved B's focal length to hold the locked frame height at
    // the new distance -- it should have moved, and set A's FL must not have.
    expect(result.current.ab.b.focalLength).not.toBe(bFlBefore)
    expect(result.current.optics.focalLength).toBe(85)
  })
})

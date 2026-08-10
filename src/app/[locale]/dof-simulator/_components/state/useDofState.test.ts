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

// Defect 1 (regression-repair): reset() used to write focalLength/aperture/
// lensId as a SEQUENCE of setters against one useState. setFocalLength(85)
// and setAperture(2.8) run BEFORE setLensId(null) in that sequence, so their
// clampApertureToLens floor (useOptics.ts, B3) fired against the lens that
// was still attached at that point -- e.g. with an f/4 zoom mounted,
// "resetting" aperture to 2.8 got floor-clamped straight back up to 4 before
// the lens was cleared two calls later. reset() must be atomic: one write
// per set, landing on the true spec defaults with no lens attached to clamp
// against. Covers both set A and set B's reset path (useDofState.ts, B2).
describe('useDofState reset() (defect 1: clamp-ordering regression)', () => {
  it('reset() lands on the true default aperture, not the still-attached lens floor', () => {
    const { result } = renderHook(() => useDofState())

    act(() => {
      result.current.optics.setLensId('nikkor-z-24-120mm-f4-s') // f/4 constant-aperture zoom
    })
    act(() => {
      result.current.optics.setFocalLength(50)
      result.current.optics.setAperture(1.8) // arbitrary non-default state pre-reset
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.optics.focalLength).toBe(85)
    expect(result.current.optics.aperture).toBe(2.8)
    expect(result.current.optics.lensId).toBe(null)
  })

  // Supplementary coverage for the B-set path (ab.b.reset()) that the fix
  // applies identically. Note: with this catalog's data, no lens's floor at
  // B's own reset focal length (50mm) exceeds B's reset aperture (f/5.6), so
  // this particular scenario does not independently reproduce a pre-fix
  // failure the way the A-set case above does -- it verifies the atomic B
  // reset lands on B's own distinct defaults, not that it "fails then
  // passes." The A-set test above is the one with paste-able failing output.
  it('reset() also lands B on its own distinct defaults with the lens cleared', () => {
    const { result } = renderHook(() => useDofState())

    act(() => {
      result.current.ab.b.setLensId('nikkor-z-24-120mm-f4-s')
    })
    act(() => {
      result.current.ab.b.setFocalLength(50)
      result.current.ab.b.setAperture(1.8)
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.ab.b.focalLength).toBe(50) // B's own reset default
    expect(result.current.ab.b.aperture).toBe(5.6) // B's own reset default
    expect(result.current.ab.b.lensId).toBe(null)
  })
})

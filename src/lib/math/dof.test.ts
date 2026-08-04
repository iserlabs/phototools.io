import { describe, it, expect } from 'vitest'
import {
  calcHyperfocal,
  calcDoF,
  calcBackgroundBlur,
  calcAiryDisk,
  calcOptimalAperture,
  calcIsolationScore,
  calcStackingSequence,
  calcEquivalentSettings,
  calcDefocusBlur,
} from './dof'

describe('calcHyperfocal', () => {
  it('calculates hyperfocal for 50mm f/2.8 FF (coc=0.03)', () => {
    // H = (50^2 / (2.8 * 0.03)) + 50 = (2500 / 0.084) + 50 ≈ 29762 mm ≈ 29.76 m
    const H = calcHyperfocal(50, 2.8, 0.03)
    expect(H).toBeCloseTo(29.81, 0)
  })

  it('calculates hyperfocal for 24mm f/8 FF (coc=0.03)', () => {
    // H = (576 / (8 * 0.03)) + 24 = (576 / 0.24) + 24 = 2400 + 24 = 2424 mm = 2.424 m
    const H = calcHyperfocal(24, 8, 0.03)
    expect(H).toBeCloseTo(2.424, 2)
  })

  it('wider aperture produces greater hyperfocal distance', () => {
    const H_wide = calcHyperfocal(50, 1.8, 0.03)
    const H_narrow = calcHyperfocal(50, 11, 0.03)
    expect(H_wide).toBeGreaterThan(H_narrow)
  })

  it('longer focal length produces greater hyperfocal distance', () => {
    const H_long = calcHyperfocal(200, 8, 0.03)
    const H_short = calcHyperfocal(24, 8, 0.03)
    expect(H_long).toBeGreaterThan(H_short)
  })
})

describe('calcDoF', () => {
  it('calculates near/far focus for 50mm f/2.8 at 3m FF', () => {
    const result = calcDoF({ focalLength: 50, aperture: 2.8, distance: 3, coc: 0.03 })
    expect(result.nearFocus).toBeGreaterThan(0)
    expect(result.farFocus).toBeGreaterThan(result.nearFocus)
    expect(result.totalDoF).toBeCloseTo(result.farFocus - result.nearFocus, 5)
    expect(result.nearFocus).toBeCloseTo(2.73, 1)
    expect(result.farFocus).toBeCloseTo(3.32, 1)
  })

  it('returns Infinity for far focus when distance >= hyperfocal', () => {
    // 24mm f/8 hyperfocal ≈ 2.4m, so distance=3 is past hyperfocal
    const result = calcDoF({ focalLength: 24, aperture: 8, distance: 3, coc: 0.03 })
    expect(result.farFocus).toBe(Infinity)
    expect(result.totalDoF).toBe(Infinity)
  })

  it('returns Infinity for far focus exactly at hyperfocal distance', () => {
    const H = calcHyperfocal(50, 2.8, 0.03)
    const result = calcDoF({ focalLength: 50, aperture: 2.8, distance: H, coc: 0.03 })
    expect(result.farFocus).toBe(Infinity)
  })

  it('wider aperture produces shallower DoF', () => {
    const shallow = calcDoF({ focalLength: 85, aperture: 1.4, distance: 5, coc: 0.03 })
    const deep = calcDoF({ focalLength: 85, aperture: 11, distance: 5, coc: 0.03 })
    expect(shallow.totalDoF).toBeLessThan(deep.totalDoF as number)
  })

  it('longer focal length produces shallower DoF at same distance', () => {
    const tele = calcDoF({ focalLength: 200, aperture: 5.6, distance: 10, coc: 0.03 })
    const wide = calcDoF({ focalLength: 35, aperture: 5.6, distance: 10, coc: 0.03 })
    expect(tele.totalDoF).toBeLessThan(wide.totalDoF as number)
  })

  it('closer distance produces shallower DoF', () => {
    const close = calcDoF({ focalLength: 50, aperture: 2.8, distance: 1, coc: 0.03 })
    const far = calcDoF({ focalLength: 50, aperture: 2.8, distance: 5, coc: 0.03 })
    expect(close.totalDoF).toBeLessThan(far.totalDoF as number)
  })

  it('reports hyperfocal distance in result', () => {
    const result = calcDoF({ focalLength: 50, aperture: 2.8, distance: 3, coc: 0.03 })
    const H = calcHyperfocal(50, 2.8, 0.03)
    expect(result.hyperfocal).toBeCloseTo(H, 5)
  })

  it('near focus is always less than subject distance', () => {
    const result = calcDoF({ focalLength: 50, aperture: 5.6, distance: 5, coc: 0.03 })
    expect(result.nearFocus).toBeLessThan(5)
  })

  it('handles very close focus distance (macro: 0.1m with 50mm lens)', () => {
    const result = calcDoF({ focalLength: 50, aperture: 2.8, distance: 0.1, coc: 0.03 })
    expect(result.nearFocus).toBeGreaterThan(0)
    expect(result.nearFocus).toBeLessThan(0.1)
    expect(result.farFocus).toBeGreaterThan(0.1)
    // Macro distances produce extremely shallow DoF
    expect(result.totalDoF).toBeLessThan(0.01)
  })

  it('handles very wide aperture (f/1.0)', () => {
    const result = calcDoF({ focalLength: 50, aperture: 1.0, distance: 3, coc: 0.03 })
    expect(result.nearFocus).toBeGreaterThan(0)
    expect(result.farFocus).toBeGreaterThan(result.nearFocus)
    // f/1.0 should produce shallower DoF than f/2.8 at the same distance
    const refResult = calcDoF({ focalLength: 50, aperture: 2.8, distance: 3, coc: 0.03 })
    expect(result.totalDoF).toBeLessThan(refResult.totalDoF as number)
  })

  it('handles very small CoC (0.001mm)', () => {
    const result = calcDoF({ focalLength: 50, aperture: 8, distance: 5, coc: 0.001 })
    expect(result.nearFocus).toBeGreaterThan(0)
    expect(result.farFocus).toBeGreaterThan(result.nearFocus)
    // Tiny CoC means much larger hyperfocal distance and shallower DoF
    const refResult = calcDoF({ focalLength: 50, aperture: 8, distance: 5, coc: 0.03 })
    expect(result.totalDoF).toBeLessThan(refResult.totalDoF as number)
    expect(result.hyperfocal).toBeGreaterThan(refResult.hyperfocal)
  })

  it('focus at exactly hyperfocal yields Infinity far focus', () => {
    // Compute hyperfocal first, then focus at that exact distance
    const H = calcHyperfocal(85, 4, 0.03)
    const result = calcDoF({ focalLength: 85, aperture: 4, distance: H, coc: 0.03 })
    expect(result.farFocus).toBe(Infinity)
    expect(result.totalDoF).toBe(Infinity)
    // Near focus should be approximately half the hyperfocal distance
    expect(result.nearFocus).toBeCloseTo(H / 2, 0)
  })
})

describe('calcBackgroundBlur', () => {
  it('85mm f/1.4, subject 3m, background 10m → ~1.24mm', () => {
    const blur = calcBackgroundBlur({
      focalLength: 85,
      aperture: 1.4,
      subjectDistance: 3,
      targetDistance: 10,
    })
    expect(blur).toBeCloseTo(1.24, 1)
  })

  it('farther background produces more blur', () => {
    const blur10m = calcBackgroundBlur({
      focalLength: 85,
      aperture: 1.4,
      subjectDistance: 3,
      targetDistance: 10,
    })
    const blur50m = calcBackgroundBlur({
      focalLength: 85,
      aperture: 1.4,
      subjectDistance: 3,
      targetDistance: 50,
    })
    expect(blur50m).toBeGreaterThan(blur10m)
  })

  it('returns zero blur when target equals subject distance', () => {
    const blur = calcBackgroundBlur({
      focalLength: 85,
      aperture: 1.4,
      subjectDistance: 3,
      targetDistance: 3,
    })
    expect(blur).toBe(0)
  })

  it('wider aperture produces more blur', () => {
    const blurWide = calcBackgroundBlur({
      focalLength: 85,
      aperture: 1.4,
      subjectDistance: 3,
      targetDistance: 10,
    })
    const blurNarrow = calcBackgroundBlur({
      focalLength: 85,
      aperture: 5.6,
      subjectDistance: 3,
      targetDistance: 10,
    })
    expect(blurWide).toBeGreaterThan(blurNarrow)
  })
})

describe('calcAiryDisk', () => {
  it('f/8 → ~0.01074mm', () => {
    const airy = calcAiryDisk(8)
    expect(airy).toBeCloseTo(0.01074, 4)
  })

  it('scales linearly with f-number (f/16 = 2× f/8)', () => {
    const airy8 = calcAiryDisk(8)
    const airy16 = calcAiryDisk(16)
    expect(airy16).toBeCloseTo(airy8 * 2, 6)
  })

  it('small value for fast apertures', () => {
    const airy = calcAiryDisk(1.4)
    expect(airy).toBeLessThan(0.002)
    expect(airy).toBeGreaterThan(0)
  })
})

describe('calcOptimalAperture', () => {
  it('at optimal aperture, Airy disk ≈ geometric blur', () => {
    const focalLength = 85
    const subjectDistance = 3
    const targetDistance = 10

    const optimalN = calcOptimalAperture(focalLength, subjectDistance, targetDistance)

    // At the optimal aperture, the Airy disk should approximately equal
    // the geometric blur disc
    const airyDisk = calcAiryDisk(optimalN)
    const geometricBlur = calcBackgroundBlur({
      focalLength,
      aperture: optimalN,
      subjectDistance,
      targetDistance,
    })

    expect(airyDisk).toBeCloseTo(geometricBlur, 3)
  })

  it('returns a reasonable f-number', () => {
    const optimalN = calcOptimalAperture(50, 2, 10)
    expect(optimalN).toBeGreaterThan(1)
    expect(optimalN).toBeLessThan(64)
  })
})

describe('calcIsolationScore', () => {
  it('returns 100 for 1.5mm blur', () => {
    // sqrt(1.5/0.5) * 100 = sqrt(3) * 100 ≈ 173 → clamped to 100
    const score = calcIsolationScore(1.5, 0.03)
    expect(score).toBe(100)
  })

  it('returns 0 for zero blur', () => {
    const score = calcIsolationScore(0, 0.03)
    expect(score).toBe(0)
  })

  it('returns intermediate score for 0.15mm blur', () => {
    // sqrt(0.15/0.5) * 100 = sqrt(0.3) * 100 ≈ 54.77
    const score = calcIsolationScore(0.15, 0.03)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(100)
    expect(score).toBeCloseTo(54.77, 0)
  })

  it('wider aperture yields higher isolation score', () => {
    const blurWide = calcBackgroundBlur({
      focalLength: 85,
      aperture: 1.4,
      subjectDistance: 3,
      targetDistance: 10,
    })
    const blurNarrow = calcBackgroundBlur({
      focalLength: 85,
      aperture: 8,
      subjectDistance: 3,
      targetDistance: 10,
    })
    const scoreWide = calcIsolationScore(blurWide, 0.03)
    const scoreNarrow = calcIsolationScore(blurNarrow, 0.03)
    expect(scoreWide).toBeGreaterThan(scoreNarrow)
  })
})

describe('calcStackingSequence', () => {
  it('produces multiple shots for a wide depth range', () => {
    const result = calcStackingSequence({
      focalLength: 100,
      aperture: 8,
      coc: 0.03,
      nearLimit: 1,
      farLimit: 5,
      overlapPct: 0.3,
    })
    expect(result.shots.length).toBeGreaterThan(1)
    expect(result.totalDepth).toBeCloseTo(4, 5)
  })

  it('first shot covers the near limit', () => {
    const result = calcStackingSequence({
      focalLength: 100,
      aperture: 8,
      coc: 0.03,
      nearLimit: 1,
      farLimit: 5,
      overlapPct: 0.3,
    })
    expect(result.shots[0].nearFocus).toBeLessThanOrEqual(1)
  })

  it('last shot covers the far limit', () => {
    const result = calcStackingSequence({
      focalLength: 100,
      aperture: 8,
      coc: 0.03,
      nearLimit: 1,
      farLimit: 5,
      overlapPct: 0.3,
    })
    const lastShot = result.shots[result.shots.length - 1]
    expect(lastShot.farFocus).toBeGreaterThanOrEqual(5)
  })

  it('adjacent shots overlap', () => {
    const result = calcStackingSequence({
      focalLength: 100,
      aperture: 8,
      coc: 0.03,
      nearLimit: 1,
      farLimit: 5,
      overlapPct: 0.3,
    })
    for (let i = 1; i < result.shots.length; i++) {
      // Each shot's near focus should be before the previous shot's far focus
      expect(result.shots[i].nearFocus).toBeLessThan(result.shots[i - 1].farFocus)
    }
  })

  it('returns single shot when DoF covers the entire range', () => {
    // 24mm f/16 at 3m with FF CoC — massive DoF
    const result = calcStackingSequence({
      focalLength: 24,
      aperture: 16,
      coc: 0.03,
      nearLimit: 2,
      farLimit: 5,
      overlapPct: 0.3,
    })
    expect(result.shots.length).toBe(1)
  })

  it('caps at 100 shots', () => {
    // Extreme case: very narrow DoF over a huge range
    const result = calcStackingSequence({
      focalLength: 200,
      aperture: 2.8,
      coc: 0.005,
      nearLimit: 1,
      farLimit: 1000,
      overlapPct: 0.5,
    })
    expect(result.shots.length).toBeLessThanOrEqual(100)
  })
})

describe('calcEquivalentSettings', () => {
  it('FF 85/1.4 → APS-C ≈ 56.67mm f/0.93 (unrealistic aperture)', () => {
    // FF (crop 1.0) → APS-C (crop 1.5)
    // ratio = 1.0 / 1.5 = 0.6667
    // equivFL = 85 × 0.6667 ≈ 56.67
    // equivAperture = 1.4 × 0.6667 ≈ 0.933
    const result = calcEquivalentSettings({
      focalLength: 85,
      aperture: 1.4,
      distance: 3,
      sourceCrop: 1.0,
      targetCrop: 1.5,
    })
    expect(result.equivalentFL).toBeCloseTo(56.67, 1)
    expect(result.equivalentAperture).toBeCloseTo(0.933, 2)
    expect(result.equivalentDistance).toBe(3)
    expect(result.isApertureRealistic).toBe(false) // < 0.95
    expect(result.isFLRealistic).toBe(true)
  })

  it('APS-C 35/2 → FF ≈ 52.5mm f/3', () => {
    // APS-C (crop 1.5) → FF (crop 1.0)
    // ratio = 1.5 / 1.0 = 1.5
    // equivFL = 35 × 1.5 = 52.5
    // equivAperture = 2 × 1.5 = 3
    const result = calcEquivalentSettings({
      focalLength: 35,
      aperture: 2,
      distance: 5,
      sourceCrop: 1.5,
      targetCrop: 1.0,
    })
    expect(result.equivalentFL).toBeCloseTo(52.5, 1)
    expect(result.equivalentAperture).toBeCloseTo(3, 1)
    expect(result.equivalentDistance).toBe(5)
    expect(result.isApertureRealistic).toBe(true)
    expect(result.isFLRealistic).toBe(true)
  })

  it('same sensor → identical values', () => {
    const result = calcEquivalentSettings({
      focalLength: 50,
      aperture: 2.8,
      distance: 3,
      sourceCrop: 1.0,
      targetCrop: 1.0,
    })
    expect(result.equivalentFL).toBeCloseTo(50, 5)
    expect(result.equivalentAperture).toBeCloseTo(2.8, 5)
    expect(result.equivalentDistance).toBe(3)
    expect(result.isApertureRealistic).toBe(true)
    expect(result.isFLRealistic).toBe(true)
  })

  it('flags unrealistic focal length', () => {
    // Very small sensor → very short equivalent FL
    const result = calcEquivalentSettings({
      focalLength: 10,
      aperture: 2,
      distance: 1,
      sourceCrop: 1.0,
      targetCrop: 5.6, // small sensor like 1/2.3"
    })
    // equivFL = 10 × (1.0 / 5.6) ≈ 1.79mm
    expect(result.isFLRealistic).toBe(false)
  })
})

describe('calcDefocusBlur', () => {
  it('is zero at the focus plane', () => {
    expect(calcDefocusBlur({ focalLength: 85, aperture: 2.8, focusDistance: 3, targetDistance: 3 })).toBe(0)
  })
  it('approaches f²/(N·(s1−f)) for far targets', () => {
    const blur = calcDefocusBlur({ focalLength: 85, aperture: 2.8, focusDistance: 3, targetDistance: 10000 })
    expect(blur).toBeCloseTo((85 * 85) / (2.8 * (3000 - 85)), 2)
  })
  it('is positive for targets in FRONT of focus (nose nearer than eyes)', () => {
    const blur = calcDefocusBlur({ focalLength: 85, aperture: 1.4, focusDistance: 1.2, targetDistance: 1.15 })
    expect(blur).toBeGreaterThan(0)
  })
  it('front and behind blur are asymmetric (front is larger at equal offset)', () => {
    const front = calcDefocusBlur({ focalLength: 85, aperture: 1.4, focusDistance: 2, targetDistance: 1.9 })
    const behind = calcDefocusBlur({ focalLength: 85, aperture: 1.4, focusDistance: 2, targetDistance: 2.1 })
    expect(front).toBeGreaterThan(behind)
  })
  it('guards degenerate inputs', () => {
    expect(calcDefocusBlur({ focalLength: 85, aperture: 2.8, focusDistance: 0.05, targetDistance: 1 })).toBe(0)
    expect(calcDefocusBlur({ focalLength: 85, aperture: 2.8, focusDistance: 3, targetDistance: 0 })).toBe(0)
  })
})

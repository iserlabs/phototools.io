import { calcAiryDisk } from './dof'

export interface MacroStackInput {
  magnification: number
  aperture: number
  coc: number // mm
  subjectDepthMm: number
  overlapPct: number // 0-1
}

export interface MacroStackResult {
  effectiveAperture: number
  sliceDofMm: number
  stepMm: number
  shotCount: number
  railTravelMm: number
  diffractionLimited: boolean
  maxSharpAperture: number
  coverageComplete: boolean
}

export interface MacroShotRow {
  number: number
  railPositionMm: number
  sliceStartMm: number
  sliceEndMm: number
}

const MAX_MACRO_SHOTS = 300

/**
 * Macro focus stack from magnification alone — distance drops out entirely.
 *   effective aperture: N_eff = N(1+m)   (pupil magnification assumed 1)
 *   slice DoF:          2·c·N·(1+m)/m²   (symmetric macro approximation)
 *   diffraction:        airy(N_eff) = 2.44·λ·N_eff vs. CoC
 */
export function calcMacroStack(input: MacroStackInput): MacroStackResult {
  const { magnification: m, aperture: N, coc: c, subjectDepthMm: depth, overlapPct } = input
  const effectiveAperture = N * (1 + m)
  const sliceDofMm = (2 * c * N * (1 + m)) / (m * m)
  const stepMm = sliceDofMm * (1 - overlapPct)
  let shotCount = depth <= sliceDofMm ? 1 : 1 + Math.ceil((depth - sliceDofMm) / stepMm)
  const coverageComplete = shotCount <= MAX_MACRO_SHOTS
  if (!coverageComplete) shotCount = MAX_MACRO_SHOTS
  const railTravelMm = (shotCount - 1) * stepMm
  const airy = calcAiryDisk(effectiveAperture)
  return {
    effectiveAperture,
    sliceDofMm,
    stepMm,
    shotCount,
    railTravelMm,
    diffractionLimited: airy > c,
    // calcAiryDisk(N) = 2.44·λ·N, so calcAiryDisk(1) == 2.44·λ exactly —
    // reusing it here avoids re-declaring dof.ts's private wavelength
    // constant a second time just to get that one coefficient back out.
    maxSharpAperture: c / (calcAiryDisk(1) * (1 + m)),
    coverageComplete,
  }
}

/** One-decimal number with any trailing ".0" dropped: 3.84 → "3.8", 4 → "4". */
const trimRatio = (n: number): string => String(Math.round(n * 10) / 10)

/**
 * Magnification as the reproduction ratio lens spec sheets quote —
 * "1:3.8" below life size, "1:1" at it, "2:1" above — so a user holding a
 * spec sheet can see their lens's number match without doing the division.
 */
export function formatReproductionRatio(magnification: number): string {
  return magnification >= 1 ? `${trimRatio(magnification)}:1` : `1:${trimRatio(1 / magnification)}`
}

/** Uniform per-shot rows for table, diagram, and exports — one tested source. */
export function macroShots(result: MacroStackResult): MacroShotRow[] {
  return Array.from({ length: result.shotCount }, (_, i) => ({
    number: i + 1,
    railPositionMm: i * result.stepMm,
    sliceStartMm: i * result.stepMm,
    sliceEndMm: i * result.stepMm + result.sliceDofMm,
  }))
}

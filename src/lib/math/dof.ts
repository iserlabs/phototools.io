/** Wavelength of green light in mm (550nm) for diffraction calculations */
const LAMBDA_MM = 0.00055

export interface DoFInput {
  focalLength: number // mm
  aperture: number // f-number
  distance: number // meters
  coc: number // circle of confusion in mm
}

export interface BlurInput {
  focalLength: number // mm
  aperture: number // f-number
  subjectDistance: number // meters
  targetDistance: number // meters
}

export interface StackingInput {
  focalLength: number
  aperture: number
  coc: number
  nearLimit: number // meters
  farLimit: number // meters
  overlapPct: number // 0-1
}

export interface StackingShot {
  number: number
  focusDistance: number // meters
  nearFocus: number // meters
  farFocus: number // meters
}

export interface StackingResult {
  shots: StackingShot[]
  totalDepth: number // meters
}

export interface EquivalenceInput {
  focalLength: number // mm
  aperture: number // f-number
  distance: number // meters
  sourceCrop: number // crop factor of source sensor
  targetCrop: number // crop factor of target sensor
}

export interface EquivalenceResult {
  equivalentFL: number // mm
  equivalentAperture: number // f-number
  equivalentDistance: number // meters
  isApertureRealistic: boolean
  isFLRealistic: boolean
}

export interface DoFResult {
  nearFocus: number // meters
  farFocus: number // meters (Infinity if past hyperfocal)
  totalDoF: number // meters (Infinity if past hyperfocal)
  hyperfocal: number // meters
}

/**
 * Calculate hyperfocal distance -- the focus distance beyond which everything
 * from half that distance to infinity appears acceptably sharp.
 *
 * Formula (all in mm):
 *   H = f^2 / (N * c) + f
 *
 * Where:
 *   f = focal length in mm
 *   N = aperture f-number
 *   c = circle of confusion in mm (sensor-dependent)
 *
 * @param focalLength - Focal length in mm
 * @param aperture    - Aperture f-number (e.g. 8 for f/8)
 * @param coc         - Circle of confusion diameter in mm
 * @returns Hyperfocal distance in meters
 */
export function calcHyperfocal(focalLength: number, aperture: number, coc: number): number {
  const H_mm = (focalLength * focalLength) / (aperture * coc) + focalLength
  return H_mm / 1000
}

/**
 * Calculate depth of field (DoF) -- the range of distances that appear
 * acceptably sharp for given lens parameters.
 *
 * Near limit:  Dn = s * (H - f) / (H + s - 2f)
 * Far limit:   Df = s * (H - f) / (H - s)   (Infinity when s >= H)
 *
 * Where s = subject distance, H = hyperfocal distance, f = focal length.
 * All internal math uses mm; inputs/outputs are in meters.
 *
 * @param input - Focal length (mm), aperture, distance (m), CoC (mm)
 * @returns Near focus, far focus, total DoF, and hyperfocal distance (all in meters)
 */
export function calcDoF(input: DoFInput): DoFResult {
  const { focalLength, aperture, distance, coc } = input
  const f = focalLength // mm
  const s = distance * 1000 // convert meters to mm
  const H = calcHyperfocal(focalLength, aperture, coc) * 1000 // hyperfocal in mm

  // Near focus distance (mm)
  const nearMm = (s * (H - f)) / (H + s - 2 * f)

  // Far focus distance (mm) — Infinity when s >= H
  let farMm: number
  if (s >= H) {
    farMm = Infinity
  } else {
    farMm = (s * (H - f)) / (H - s)
  }

  const nearFocus = nearMm / 1000
  const farFocus = farMm === Infinity ? Infinity : farMm / 1000
  const totalDoF = farFocus === Infinity ? Infinity : farFocus - nearFocus
  const hyperfocal = H / 1000

  return { nearFocus, farFocus, totalDoF, hyperfocal }
}

/**
 * Calculate blur disc diameter at a given target distance when focused
 * at subjectDistance. Returns blur in mm.
 *
 * For targets behind the subject (targetDistance > subjectDistance):
 *   blur = f/N × (s/(s-f) × ((d-f)/d) - 1)
 * For targets in front of the subject (targetDistance < subjectDistance):
 *   blur = f/N × (1 - s/(s-f) × ((d-f)/d))
 *
 * Where f = focal length (mm), N = f-number, s = subject distance (mm),
 * d = target distance (mm).
 */
export function calcBackgroundBlur(input: BlurInput): number {
  const { focalLength: f, aperture: N, subjectDistance, targetDistance } = input
  const s = subjectDistance * 1000 // meters to mm
  const d = targetDistance * 1000 // meters to mm

  if (Math.abs(s - d) < 1e-9) return 0

  const magnificationFactor = s / (s - f) * ((d - f) / d)

  if (d > s) {
    // Target behind subject
    return Math.abs((f / N) * (magnificationFactor - 1))
  } else {
    // Target in front of subject
    return Math.abs((f / N) * (1 - magnificationFactor))
  }
}

/**
 * Calculate the Airy disk diameter — the diffraction limit for a given
 * aperture. Uses λ = 550nm (green light).
 *
 * Formula: airy = 2.44 × λ × N
 *
 * @param aperture - f-number
 * @returns Airy disk diameter in mm
 */
export function calcAiryDisk(aperture: number): number {
  return 2.44 * LAMBDA_MM * aperture
}

/**
 * Calculate the optimal aperture where diffraction equals geometric blur
 * (the "sweet spot" aperture for maximum resolution).
 *
 * Solves: N = sqrt(f × blurFactor / (2.44 × λ))
 * where blurFactor = |s/(s-f) × ((d-f)/d) - 1|
 *
 * @param focalLength - Focal length in mm
 * @param subjectDistance - Subject distance in meters
 * @param targetDistance - Target distance in meters
 * @returns Optimal f-number
 */
export function calcOptimalAperture(
  focalLength: number,
  subjectDistance: number,
  targetDistance: number
): number {
  const f = focalLength
  const s = subjectDistance * 1000 // meters to mm
  const d = targetDistance * 1000 // meters to mm

  const magnificationFactor = s / (s - f) * ((d - f) / d)
  const blurFactor = Math.abs(magnificationFactor - 1)

  return Math.sqrt((f * blurFactor) / (2.44 * LAMBDA_MM))
}

/**
 * Calculate a 0-100 subject isolation score based on background blur.
 * Uses sqrt scaling with a 0.5mm threshold for full isolation.
 *
 * score = clamp(sqrt(blur / 0.5) × 100, 0, 100)
 *
 * @param backgroundBlurMm - Background blur disc diameter in mm
 * @param _coc - Circle of confusion (accepted for API symmetry with callers
 *   that pass it but intentionally unused; scaling is absolute in mm)
 * @returns Isolation score 0-100
 */
export function calcIsolationScore(backgroundBlurMm: number, _coc: number): number {
  if (backgroundBlurMm <= 0) return 0
  const raw = Math.sqrt(backgroundBlurMm / 0.5) * 100
  return Math.min(Math.max(raw, 0), 100)
}

/**
 * Calculate focus stacking sequence to cover a depth range.
 *
 * Algorithm: Start at nearLimit, compute DoF at that focus distance,
 * step forward by dofRange × (1 - overlapPct), repeat until farFocus >= farLimit.
 * Capped at 100 shots.
 *
 * @param input - Stacking parameters
 * @returns Array of shots and total depth covered
 */
export function calcStackingSequence(input: StackingInput): StackingResult {
  const { focalLength, aperture, coc, nearLimit, farLimit, overlapPct } = input
  const shots: StackingShot[] = []
  const MAX_SHOTS = 100

  let currentFocus = nearLimit

  while (shots.length < MAX_SHOTS) {
    const dof = calcDoF({
      focalLength,
      aperture,
      distance: currentFocus,
      coc,
    })

    const shot: StackingShot = {
      number: shots.length + 1,
      focusDistance: currentFocus,
      nearFocus: dof.nearFocus,
      farFocus: dof.farFocus === Infinity ? farLimit : dof.farFocus,
    }
    shots.push(shot)

    // If this shot's far focus already covers the far limit, we're done
    if (dof.farFocus >= farLimit) break

    // Step forward: advance by the usable (non-overlapping) portion of DoF
    const dofRange = dof.farFocus - dof.nearFocus
    const step = dofRange * (1 - overlapPct)
    if (step <= 0) break // safety: prevent infinite loop

    currentFocus = currentFocus + step
  }

  const totalDepth = farLimit - nearLimit

  return { shots, totalDepth }
}

/**
 * Calculate equivalent lens settings between different sensor formats.
 *
 * Multiplies focal length and aperture by the ratio sourceCrop/targetCrop.
 * Distance remains the same (perspective doesn't change with sensor size).
 *
 * @param input - Equivalence parameters
 * @returns Equivalent settings and realism flags
 */
export function calcEquivalentSettings(input: EquivalenceInput): EquivalenceResult {
  const { focalLength, aperture, distance, sourceCrop, targetCrop } = input
  const ratio = sourceCrop / targetCrop

  const equivalentFL = focalLength * ratio
  const equivalentAperture = aperture * ratio
  const equivalentDistance = distance

  return {
    equivalentFL,
    equivalentAperture,
    equivalentDistance,
    isApertureRealistic: equivalentAperture >= 0.95 && equivalentAperture <= 64,
    isFLRealistic: equivalentFL >= 8 && equivalentFL <= 800,
  }
}

export interface DefocusBlurParams {
  focalLength: number   // mm
  aperture: number      // f-number
  focusDistance: number // meters (subject / focus plane)
  targetDistance: number // meters (plane being evaluated)
}

/**
 * Defocus CoC on the sensor (mm) for a plane at targetDistance while focused
 * at focusDistance. Valid on BOTH sides of focus:
 *   blur = f²/(N·(s1−f)) · |s2−s1|/s2   (all distances in mm)
 */
export function calcDefocusBlur({ focalLength, aperture, focusDistance, targetDistance }: DefocusBlurParams): number {
  const s1 = focusDistance * 1000
  const s2 = targetDistance * 1000
  if (s1 <= focalLength || s2 <= 0 || aperture <= 0) return 0
  return ((focalLength * focalLength) / (aperture * (s1 - focalLength))) * (Math.abs(s2 - s1) / s2)
}

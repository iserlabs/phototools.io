/** Wavelength of green light in mm (550nm) for diffraction calculations */
const LAMBDA_MM = 0.00055

export interface DoFInput {
  focalLength: number // mm
  aperture: number // f-number
  distance: number // meters
  coc: number // circle of confusion in mm
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
 * Default circle-of-confusion baseline: the traditional 0.03mm 35mm-equivalent
 * figure scaled down by the sensor's crop factor. The single source of truth
 * for this formula -- both the derived-values engine (unrounded, used in the
 * actual DoF math) and the Advanced panel's custom-CoC checkbox seed (rounded
 * to 4 decimals for display) call this rather than each re-encoding `0.03 /
 * cropFactor` (dof-simulator-rebuild final fix wave, B7).
 *
 * @param cropFactor - Sensor crop factor relative to full-frame (1.0 = FF)
 * @returns Default CoC in mm
 */
export function calcDefaultCoc(cropFactor: number): number {
  return 0.03 / cropFactor
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

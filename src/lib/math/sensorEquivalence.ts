/**
 * Calculate the area ratio of two sensors relative to a reference (default: full frame 36×24mm).
 *
 * The area ratio is used to determine how much light a sensor gathers compared to
 * the reference sensor. A 1.53× crop sensor has an area ratio of 1/1.53² ≈ 0.43.
 *
 * @param w     - Sensor width in mm
 * @param h     - Sensor height in mm
 * @param refW  - Reference sensor width (default 36, full frame)
 * @param refH  - Reference sensor height (default 24, full frame)
 * @returns Area ratio (sensor area / reference area)
 */
export function areaRatio(w: number, h: number, refW = 36, refH = 24): number {
  const sensorArea = w * h
  const refArea = refW * refH
  return sensorArea / refArea
}

/**
 * Calculate the EV difference between two sensors as the log₂ of their area ratio.
 *
 * One exposure value (EV) represents a doubling or halving of light; since area
 * directly controls light gathered, the EV difference is log₂(area ratio).
 * A sensor with half the area is one stop dimmer (−1 EV).
 *
 * @param w     - Sensor width in mm
 * @param h     - Sensor height in mm
 * @param refW  - Reference sensor width (default 36, full frame)
 * @param refH  - Reference sensor height (default 24, full frame)
 * @returns EV difference (log₂ of area ratio)
 */
export function evDiff(w: number, h: number, refW = 36, refH = 24): number {
  return Math.log2(areaRatio(w, h, refW, refH))
}

/**
 * Format an EV value as a human-readable string with proper sign and precision.
 *
 * Positive values get a leading '+', negative values use the Unicode minus sign
 * (U+2212, not an ASCII hyphen). Values with |ev| < 0.05 are rendered as '0.0 EV'
 * without a sign. All values are rounded to one decimal place.
 *
 * Examples:
 *   formatEv(2.18)  → '+2.2 EV'
 *   formatEv(-1.24) → '−1.2 EV' (note Unicode minus)
 *   formatEv(0.04)  → '0.0 EV'
 *
 * @param ev - EV value
 * @returns Formatted string
 */
export function formatEv(ev: number): string {
  // Round to one decimal place
  const rounded = Math.round(ev * 10) / 10

  // Treat rounded values of zero (including negative zero) as unsigned zero
  // === 0 is true for both 0 and -0, so this catches the whole class
  if (rounded === 0) {
    return '0.0 EV'
  }

  // Format with appropriate sign for non-zero values
  if (rounded > 0) {
    return `+${rounded.toFixed(1)} EV`
  } else {
    // Use Unicode minus sign (U+2212) for negative values
    return `−${Math.abs(rounded).toFixed(1)} EV`
  }
}

/**
 * Calculate the equivalent focal length when mounting a lens from one sensor onto another.
 *
 * The equivalent focal length accounts for the difference in crop factors between
 * sensors. If a lens is designed for sensor A and mounted on sensor B, the effective
 * field of view becomes:
 *   focal_B = focal_A × (cropA / cropB)
 *
 * For example, a 50mm lens on APS-C (crop factor 1.53) appears as 50 × 1.53 = 76.5mm
 * in full-frame (crop factor 1) terms, rounded to 77mm.
 *
 * @param focal  - Original focal length in mm
 * @param cropA  - Crop factor of the original sensor
 * @param cropB  - Crop factor of the target sensor
 * @returns Equivalent focal length in mm, rounded to nearest whole number
 */
export function equivalentFocal(focal: number, cropA: number, cropB: number): number {
  return Math.round((focal * cropA) / cropB)
}

/**
 * Calculate the equivalent aperture when mounting a lens from one sensor onto another.
 *
 * Aperture is relative to focal length, so when focal length changes due to crop
 * differences, so does the effective aperture. The equivalent aperture is:
 *   ap_B = ap_A × (cropA / cropB)
 *
 * For example, an f/2.8 lens on APS-C (crop factor 1.53) appears as f/2.8 × 1.53 = f/4.284
 * in full-frame terms, rounded to f/4.3.
 *
 * @param ap     - Original aperture f-number
 * @param cropA  - Crop factor of the original sensor
 * @param cropB  - Crop factor of the target sensor
 * @returns Equivalent aperture f-number, rounded to one decimal place
 */
export function equivalentAperture(ap: number, cropA: number, cropB: number): number {
  const equivalent = (ap * cropA) / cropB
  return Math.round(equivalent * 10) / 10
}

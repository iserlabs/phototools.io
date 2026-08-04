import { mpToPixelDimensions } from './resolution'

/**
 * Calculate pixel pitch (the physical size of one pixel) from sensor dimensions.
 *
 * When sensorHeightMm is provided, uses the actual aspect ratio.
 * Otherwise falls back to a 3:2 aspect ratio (standard for most cameras).
 *
 * The derivation:
 *   totalPixels = resolutionMp * 1,000,000
 *   aspectRatio = sensorWidth / sensorHeight
 *   widthPixels = sqrt(totalPixels * aspectRatio)
 *   pixelPitch  = sensorWidth / widthPixels
 *
 * @param sensorWidthMm  - Sensor width in mm (e.g. 36 for full frame)
 * @param resolutionMp   - Sensor resolution in megapixels (e.g. 24)
 * @param sensorHeightMm - Sensor height in mm (optional, defaults to 3:2 aspect)
 * @returns Pixel pitch in micrometers (µm)
 */
export function pixelPitch(sensorWidthMm: number, resolutionMp: number, sensorHeightMm?: number): number {
  const aspect = sensorHeightMm
    ? { w: sensorWidthMm, h: sensorHeightMm }
    : { w: 3, h: 2 }
  const { pxW } = mpToPixelDimensions(resolutionMp, aspect)
  const pitchMm = sensorWidthMm / pxW
  return pitchMm * 1000
}

/**
 * Calculate the aperture at which diffraction begins to soften the image
 * beyond what the sensor can resolve — the "diffraction limit".
 *
 * Based on the Airy disk diameter matching the pixel pitch:
 *   d_airy ≈ 2.44 · λ · N      (diameter, first minimum)
 * Solving for N at d_airy = pixelPitch and λ = 550nm (green light):
 *   N ≈ pixelPitch / (2.44 × 0.00055 mm) ≈ pixelPitch / 0.001342 mm
 *                                        ≈ pixelPitch(µm) / 1.342
 * The 0.67 constant used below is the industry-standard simplification that
 * matches the Airy disk *radius* (not diameter) at the first minimum:
 *   N ≈ pixelPitch(µm) / 0.67
 * Stopping down beyond this f-number will reduce per-pixel sharpness due to
 * diffraction, even though overall depth of field increases.
 *
 * @param pixelPitchUm - Pixel pitch in micrometers
 * @returns Diffraction-limited f-number
 */
export function diffractionLimitedAperture(pixelPitchUm: number): number {
  return pixelPitchUm / 0.67
}

/**
 * Airy disk diameter (first minimum) for a given aperture.
 *
 *   d ≈ 2.44 · λ · N
 *
 * With λ in nm and the result in µm: d = 2.44 × (λ/1000) × N.
 * At f/8 in green light (550nm): 2.44 × 0.55 × 8 ≈ 10.7 µm — larger than any
 * current sensor's pixel pitch, which is why landscape shooters avoid f/16+.
 *
 * @param fNumber      - Aperture f-number (e.g. 8)
 * @param wavelengthNm - Light wavelength in nanometers (default 550, green)
 * @returns Airy disk diameter in micrometers (µm)
 */
export function airyDiskDiameterUm(fNumber: number, wavelengthNm = 550): number {
  return 2.44 * (wavelengthNm / 1000) * fNumber
}

export type ApertureVerdict = 'sharp' | 'borderline' | 'soft'

/**
 * Classify an aperture against a sensor's diffraction limit.
 *
 * The limit marks where softening becomes measurable, not where images fall
 * apart — so there is a tolerance band above it (up to 1.5x the limit, i.e.
 * roughly one stop) where diffraction is present but usually an acceptable
 * trade for depth of field.
 *
 * @param fNumber - The aperture being evaluated
 * @param limit   - Diffraction-limited f-number from diffractionLimitedAperture()
 */
export function apertureVerdict(fNumber: number, limit: number): ApertureVerdict {
  if (fNumber <= limit) return 'sharp'
  if (fNumber <= limit * 1.5) return 'borderline'
  return 'soft'
}

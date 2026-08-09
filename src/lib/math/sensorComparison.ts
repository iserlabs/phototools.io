import { areaRatio, evDiff, equivalentFocal } from './sensorEquivalence'

/**
 * Which side of a sensor comparison ('a' or 'b') an attribute refers to.
 */
export type ComparedSide = 'a' | 'b'

/**
 * Direction-aware comparison of two sensors.
 *
 * This type captures the structural and optical differences between two sensors
 * in a way that is independent of which sensor was passed as 'a' and which as 'b'.
 * The 'larger' and 'smaller' fields always refer to the sensor with the greater
 * and lesser physical area, respectively. The 'lightRatio' and 'reachFactor' are
 * always >= 1, representing the magnitude of the difference. When sensors are
 * near-equal in area (within NEAR_EQUAL_EV), all advantage fields are zeroed.
 */
export type SensorComparison = {
  evDelta: number            // evDiff(a vs b); positive when A gathers more light
  nearEqual: boolean         // |evDelta| < NEAR_EQUAL_EV
  larger: ComparedSide | null   // null when nearEqual
  smaller: ComparedSide | null  // null when nearEqual
  lightRatio: number         // larger area / smaller area, always >= 1 (1 when nearEqual)
  lightEvAbs: number         // |evDelta|
  reachFactor: number        // smaller sensor's crop / larger sensor's crop, always >= 1 (1 when nearEqual)
  areaRatioAB: number        // a area / b area
  areaRatioBA: number        // b area / a area
  focalAonB: number          // a 50mm lens on A, expressed in B's terms
  focalBonA: number
}

/**
 * EV threshold below which two sensors are considered near-equal in light-gathering ability.
 *
 * Sensors within 0.15 EV of each other have negligible practical difference in
 * light collection, so comparisons between them suppress the 'larger' and 'smaller'
 * designations and set all advantage metrics to unity.
 */
export const NEAR_EQUAL_EV = 0.15

/**
 * Compare two sensors with direction awareness.
 *
 * Given two sensors A and B with physical dimensions (width, height) and crop factors,
 * produce a structured comparison that captures their light-gathering and reach-extension
 * differences in a way that is independent of the order in which they are passed.
 *
 * The comparison identifies which sensor is physically larger (and thus gathers more light),
 * which is physically smaller (and thus offers more reach on any given lens), and quantifies
 * both advantages. When the sensors are near-equal in area, all advantage fields are zeroed
 * and 'larger'/'smaller' are null.
 *
 * Example:
 *   Full frame (36×24) vs APS-C (23.5×15.6) at default 50mm focal length:
 *   - FF area = 864 mm²
 *   - APS-C area ≈ 366.6 mm²
 *   - evDelta = log₂(864/366.6) ≈ 1.237 (FF is ~1.24 stops brighter)
 *   - lightRatio ≈ 2.357 (FF gathers ~2.4× as much light)
 *   - reachFactor = 1.53/1.0 = 1.53 (APS-C is 1.53× "longer")
 *   - focalAonB = round(50 × 1.0 / 1.53) = 33 (a 50mm on FF ≈ 33mm on APS-C)
 *
 * @param a     - Sensor A with width (w), height (h), and crop factor (cropFactor)
 * @param b     - Sensor B with width (w), height (h), and crop factor (cropFactor)
 * @param focal - Default focal length for cross-sensor equivalence (default 50mm)
 * @returns Direction-aware comparison structure
 */
export function compareSensors(
  a: { w: number; h: number; cropFactor: number },
  b: { w: number; h: number; cropFactor: number },
  focal = 50,
): SensorComparison {
  // Compute EV difference: positive when A gathers more light
  const evDelta = evDiff(a.w, a.h, b.w, b.h)

  // Check if sensors are near-equal in light-gathering ability
  const nearEqual = Math.abs(evDelta) < NEAR_EQUAL_EV

  let larger: ComparedSide | null
  let smaller: ComparedSide | null
  let lightRatio: number
  let reachFactor: number

  if (nearEqual) {
    // When near-equal, suppress advantage designations
    larger = null
    smaller = null
    lightRatio = 1
    reachFactor = 1
  } else {
    // Determine which sensor is physically larger based on evDelta
    if (evDelta > 0) {
      // A has greater area (more light)
      larger = 'a'
      smaller = 'b'
    } else {
      // B has greater area (more light)
      larger = 'b'
      smaller = 'a'
    }

    // Light ratio: always larger area / smaller area
    const areaA = a.w * a.h
    const areaB = b.w * b.h
    const largerArea = Math.max(areaA, areaB)
    const smallerArea = Math.min(areaA, areaB)
    lightRatio = largerArea / smallerArea

    // Reach factor: always smaller sensor's crop / larger sensor's crop
    // Physically smaller sensor has higher crop factor
    const largerCrop = larger === 'a' ? a.cropFactor : b.cropFactor
    const smallerCrop = smaller === 'a' ? a.cropFactor : b.cropFactor
    reachFactor = smallerCrop / largerCrop
  }

  // Absolute EV difference (always positive or zero)
  const lightEvAbs = Math.abs(evDelta)

  // Area ratios: both directions
  const areaRatioAB = areaRatio(a.w, a.h, b.w, b.h)
  const areaRatioBA = areaRatio(b.w, b.h, a.w, a.h)

  // Focal length equivalence: both directions
  const focalAonB = equivalentFocal(focal, a.cropFactor, b.cropFactor)
  const focalBonA = equivalentFocal(focal, b.cropFactor, a.cropFactor)

  return {
    evDelta,
    nearEqual,
    larger,
    smaller,
    lightRatio,
    lightEvAbs,
    reachFactor,
    areaRatioAB,
    areaRatioBA,
    focalAonB,
    focalBonA,
  }
}

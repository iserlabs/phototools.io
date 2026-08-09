import { APERTURES_THIRD_STOP } from '@/lib/data/camera'

/**
 * Snaps a raw f-number to the nearest value on the third-stop aperture
 * ladder, comparing distances in log space so "nearest" matches perceived
 * (multiplicative) aperture steps rather than raw linear distance.
 */
export function snapToThirdStop(raw: number): number {
  let best = APERTURES_THIRD_STOP[0]
  let bestDist = Infinity
  for (const ap of APERTURES_THIRD_STOP) {
    const dist = Math.abs(Math.log(ap) - Math.log(raw))
    if (dist < bestDist) {
      bestDist = dist
      best = ap
    }
  }
  return best
}

/** Formats an f-number as "f/2.8" (whole stops render without a decimal, e.g. "f/2"). */
export function formatAperture(f: number): string {
  return f % 1 === 0 ? `f/${f}` : `f/${f.toFixed(1)}`
}

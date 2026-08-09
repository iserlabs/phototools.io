/**
 * Convert a megapixel count plus an aspect ratio into exact pixel dimensions.
 * Uses the marketing convention: 1 MP = 1,000,000 pixels.
 */
export function mpToPixelDimensions(
  mp: number,
  aspect: { w: number; h: number }
): { pxW: number; pxH: number } {
  const totalPixels = mp * 1e6
  const ratio = aspect.w / aspect.h
  const pxW = Math.round(Math.sqrt(totalPixels * ratio))
  const pxH = Math.round(pxW / ratio)
  return { pxW, pxH }
}

/** Snap a w/h pair to a canonical aspect label (e.g., '3:2', '4:3'). */
export function formatAspectRatio(w: number, h: number): string {
  const r = w / h
  if (Math.abs(r - 3 / 2) < 0.02) return '3:2'
  if (Math.abs(r - 4 / 3) < 0.02) return '4:3'
  if (Math.abs(r - 16 / 9) < 0.02) return '16:9'
  if (Math.abs(r - 5 / 4) < 0.02) return '5:4'
  if (Math.abs(r - 1) < 0.02) return '1:1'
  if (Math.abs(r - 7 / 5) < 0.02) return '7:5'
  const g = gcd(Math.round(w * 10), Math.round(h * 10))
  const rw = Math.round(w * 10 / g)
  const rh = Math.round(h * 10 / g)
  if (rw > 21 || rh > 21) return `${r.toFixed(2)}:1`
  return `${rw}:${rh}`
}

function gcd(a: number, b: number): number {
  while (b) { [a, b] = [b, a % b] }
  return a
}

/**
 * Effective MP after cropping to a smaller sensor target.
 * `cropFactor` = FF diagonal ÷ target diagonal (1.5 for APS-C, 2.0 for M4/3).
 * Area crop is cropFactor², so mp_cropped = mp / cropFactor².
 */
export function cropReach(mp: number, cropFactor: number): number {
  return mp / (cropFactor * cropFactor)
}

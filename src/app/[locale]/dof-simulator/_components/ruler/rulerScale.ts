// Pure log-scale mapping for the DOF ruler's 0.3m-50m(+∞) axis. No React, no
// side effects — DofRuler positions ticks/figures/the in-focus band by
// calling these; the component owns padding and pixel measurement, this
// file only maps the logarithmic distance domain onto a normalized
// [0, widthPx] pixel range.

export const RULER_MIN = 0.3
export const RULER_MAX = 50

const LOG_MIN = Math.log10(RULER_MIN)
const LOG_MAX = Math.log10(RULER_MAX)
const LOG_RANGE = LOG_MAX - LOG_MIN

/**
 * Maps a distance in meters to an X pixel offset on a `widthPx`-wide log
 * axis running from RULER_MIN (x=0) to RULER_MAX (x=widthPx). Distances
 * above RULER_MAX -- including Infinity, the hyperfocal "everything beyond
 * is sharp" case -- pin to widthPx (the "∞ zone") instead of producing NaN
 * or an off-scale coordinate. Distances below RULER_MIN clamp to x=0.
 */
export function distToX(distanceM: number, widthPx: number): number {
  if (!Number.isFinite(distanceM) || distanceM > RULER_MAX) return widthPx
  const clamped = Math.max(RULER_MIN, distanceM)
  const t = (Math.log10(clamped) - LOG_MIN) / LOG_RANGE
  return t * widthPx
}

/** Inverse of distToX: an X pixel offset back to a distance in meters. */
export function xToDist(x: number, widthPx: number): number {
  if (!(widthPx > 0)) return RULER_MIN
  const t = Math.max(0, Math.min(1, x / widthPx))
  return Math.pow(10, LOG_MIN + t * LOG_RANGE)
}

/** Fixed tick marks shown along the ruler axis, ascending. */
export function rulerTicks(): number[] {
  return [0.3, 0.5, 1, 2, 3, 5, 10, 15, 25, 50]
}

const SLIDER_STEPS = 1000

/**
 * Log-scale slider math shared by LensPanel's focal-length slider and
 * DistancePanel's distance slider — both need a wide numeric range (mm or
 * meters) mapped onto a linear 0..SLIDER_STEPS range input so small values
 * get proportionally more precision than large ones.
 */
export function toSliderPos(value: number, min: number, max: number): number {
  // Prime lenses report flMin === flMax (a single-point envelope) — treat
  // the slider as pinned rather than dividing by a zero-width log range.
  if (max <= min) return 0
  const logMin = Math.log(min)
  const logMax = Math.log(max)
  const clamped = Math.min(Math.max(value, min), max)
  return Math.round(((Math.log(clamped) - logMin) / (logMax - logMin)) * SLIDER_STEPS)
}

export function fromSliderPos(pos: number, min: number, max: number): number {
  if (max <= min) return min
  const logMin = Math.log(min)
  const logMax = Math.log(max)
  return Math.exp(logMin + (pos / SLIDER_STEPS) * (logMax - logMin))
}

export { SLIDER_STEPS }

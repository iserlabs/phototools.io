const METERS_PER_INCH = 0.0254

/**
 * Formats a distance for display. Metric shows centimeters under a meter and
 * meters (1 decimal) at/above; imperial always shows feet + inches.
 */
export function formatDistance(m: number, imperial: boolean): string {
  if (!isFinite(m)) return '∞'

  if (imperial) {
    const totalInches = m / METERS_PER_INCH
    let feet = Math.floor(totalInches / 12)
    let inches = Math.round(totalInches - feet * 12)
    if (inches === 12) {
      feet += 1
      inches = 0
    }
    return `${feet} ft ${inches} in`
  }

  if (m < 1) return `${Math.round(m * 100)} cm`
  return `${Math.round(m * 10) / 10} m`
}

/** Formats a millimeter value (focal length, CoC readouts) for display. */
export function formatMm(v: number): string {
  return `${Math.round(v)}mm`
}

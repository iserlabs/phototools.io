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

/** Formats a millimeter value (focal length, effective/equivalent FL) for display. */
export function formatMm(v: number): string {
  return `${Math.round(v)}mm`
}

/**
 * Formats a sub-millimetre-precision optical value (circle of confusion,
 * background blur) for display. `formatMm`'s whole-mm rounding collapses
 * these — CoC ranges roughly 0.008-0.047mm across sensor formats, and
 * background blur commonly falls under 0.5mm — always printing "0mm".
 *
 * Magnitude-adaptive precision: small values (< 0.1mm, the CoC range) get 4
 * decimals so different sensor formats stay distinguishable (0.0081 vs
 * 0.0196 vs 0.0290); larger values get progressively fewer so the readout
 * doesn't look falsely over-precise. Trailing zeros are trimmed so e.g.
 * 2.30 renders as "2.3mm", not "2.30mm".
 */
export function formatPreciseMm(v: number): string {
  if (v === 0) return '0mm'
  const abs = Math.abs(v)
  const decimals = abs < 0.1 ? 4 : abs < 1 ? 3 : abs < 10 ? 2 : 1
  const fixed = v.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '')
  return `${fixed}mm`
}

/** Distance (m) that makes the vertical frame equal frameHeightMm at this FL/sensor. */
export function distanceForFraming(frameHeightMm: number, focalLengthMm: number, sensorHMm: number): number {
  return (frameHeightMm * focalLengthMm) / (sensorHMm * 1000)
}

/** Focal length (mm) that makes the vertical frame equal frameHeightMm at this distance/sensor. */
export function flForFraming(frameHeightMm: number, distanceM: number, sensorHMm: number): number {
  return (sensorHMm * distanceM * 1000) / frameHeightMm
}

export interface Clamped { value: number; clamped: boolean }

/** Clamp with report — the UI shows "limit reached" instead of drifting silently. */
export function clampTo(value: number, min: number, max: number): Clamped {
  if (value < min) return { value: min, clamped: true }
  if (value > max) return { value: max, clamped: true }
  return { value, clamped: false }
}

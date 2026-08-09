import { RULER_MIN, RULER_MAX } from './rulerScale'

// SVG viewBox layout shared by DofRuler and RulerBackdrop. The pure
// rulerScale functions only know about a [0, widthPx] track; this module
// owns the padding around that track (room for the camera figure on the
// left, the ∞ pin on the right) so both files agree on where things sit.
export const VB_W = 1000
export const VB_H = 96
export const PAD_L = 60
export const PAD_R = 46
export const TRACK_W = VB_W - PAD_L - PAD_R
export const GROUND_Y = 62
export const BAND_H = 14
export const AXIS_Y = 80
export const LABEL_Y = 94
export const NUDGE_M = 0.1

// Presentational — see AppearancePanel.tsx / DistancePanel.tsx for the
// labels-prop pattern. DofRulerConnected.tsx supplies real translations;
// DofRuler (and its tests) stays provider-free with English defaults.
export interface RulerLabels {
  near: string
  far: string
  inFocus: string
  subject: string
  hyperfocal: string
  infinity: string
  distanceUnit: string
}

export const DEFAULT_RULER_LABELS: RulerLabels = {
  near: 'Near',
  far: 'Far',
  inFocus: 'In Focus',
  subject: 'Subject',
  hyperfocal: 'Hyperfocal',
  infinity: '∞',
  distanceUnit: 'm',
}

export function clampRange(v: number): number {
  return Math.min(RULER_MAX, Math.max(RULER_MIN, v))
}

export function formatMeters(m: number, unit: string): string {
  return `${Math.round(m * 10) / 10}${unit}`
}

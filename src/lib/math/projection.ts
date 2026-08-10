/** Vertical scene height captured at the subject plane, in mm. */
export function frameHeightAtDistance(distanceM: number, focalLengthMm: number, sensorHMm: number): number {
  if (distanceM <= 0 || focalLengthMm <= 0 || sensorHMm <= 0) return 0
  return (sensorHMm * distanceM * 1000) / focalLengthMm
}

/** Subject height as a fraction of frame height (>1 = subject taller than frame). */
export function figureFraction(subjectHeightM: number, distanceM: number, focalLengthMm: number, sensorHMm: number): number {
  const frame = frameHeightAtDistance(distanceM, focalLengthMm, sensorHMm)
  return frame > 0 ? (subjectHeightM * 1000) / frame : 0
}

export type CropLevel = 'full' | 'torso' | 'face'

export function selectCropLevel(figureFrac: number): CropLevel {
  if (figureFrac > 3) return 'face'
  if (figureFrac > 1.3) return 'torso'
  return 'full'
}

const EYE_ANCHOR = 0.38 // eye line sits at 38% of viewport height when figure overflows

export interface ModelLayout { heightPx: number; topPx: number }

export function modelLayout(figurePx: number, viewportPx: number, eyeLineRatio: number): ModelLayout {
  if (figurePx <= viewportPx) return { heightPx: figurePx, topPx: viewportPx - figurePx }
  return { heightPx: figurePx, topPx: viewportPx * EYE_ANCHOR - figurePx * eyeLineRatio }
}

/** Defocus CoC on sensor (mm) → blur radius in viewport px. */
export function blurMmToPx(blurMm: number, sensorWMm: number, viewportWPx: number): number {
  return sensorWMm > 0 ? (blurMm / sensorWMm) * viewportWPx : 0
}

// Shared blur-rendering constants: kept here (alongside `blurMmToPx`) rather
// than in `ModelLayer.tsx` so that framework-agnostic consumers — like the
// PNG export layout (`export/exportLayout.ts`) — can depend on a pure math
// module instead of a `'use client'` React component.
/** CSS-filter blur radius cap, in px, at viewport (1x) scale. */
export const MAX_BLUR_PX = 24
/** Minimum blur radius, in px, below which no blur filter is applied. */
export const BLUR_VISIBLE_THRESHOLD_PX = 0.5

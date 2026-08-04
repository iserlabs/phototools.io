import { calcFOV } from './fov'
import { mpToPixelDimensions } from './resolution'

/**
 * Panorama shot-planning math.
 *
 * A stitched panorama is a sequence of frames rotated by a fixed increment.
 * Each frame must overlap its neighbor so the stitcher can find control
 * points — the usable rotation per shot is the frame's FOV minus the overlap:
 *
 *   increment = frameFOV × (1 − overlap)
 *
 * Total coverage after n frames: frameFOV + (n − 1) × increment.
 */

export type PanoOrientation = 'landscape' | 'portrait'

export interface PanoInput {
  focalLength: number
  cropFactor: number
  orientation: PanoOrientation
  /** Overlap between adjacent frames as a fraction (0.3 = 30%) */
  overlap: number
  /** Desired horizontal coverage in degrees (360 = full wrap) */
  targetHDeg: number
  rows: number
  /** Camera resolution in megapixels (for stitched-size estimate) */
  megapixels: number
}

export interface PanoPlan {
  frameFovH: number
  frameFovV: number
  incrementH: number
  framesPerRow: number
  totalFrames: number
  /** Achieved coverage (≥ target, capped at 360) */
  coverageH: number
  coverageV: number
  stitchedMp: number
}

export function rotationIncrement(frameFovDeg: number, overlap: number): number {
  return frameFovDeg * (1 - overlap)
}

/** Number of frames needed to cover an arc. Full 360° wraps require ceil(360/increment). */
export function framesForArc(targetDeg: number, frameFovDeg: number, overlap: number): number {
  if (frameFovDeg <= 0) return 0
  const inc = rotationIncrement(frameFovDeg, overlap)
  if (inc <= 0) return 0
  if (targetDeg >= 360) return Math.max(1, Math.ceil(360 / inc))
  if (targetDeg <= frameFovDeg) return 1
  return Math.ceil((targetDeg - frameFovDeg) / inc) + 1
}

/** Coverage achieved by n frames at a given increment (capped at 360). */
export function arcCoverage(frames: number, frameFovDeg: number, overlap: number): number {
  if (frames <= 0) return 0
  const coverage = frameFovDeg + (frames - 1) * rotationIncrement(frameFovDeg, overlap)
  return Math.min(coverage, 360)
}

/**
 * Estimated stitched output resolution. Linear pixel dimensions grow by
 * (1 − overlap) of a frame per additional frame in each direction.
 */
export function stitchedMegapixels(
  megapixels: number,
  framesPerRow: number,
  rows: number,
  overlap: number,
  orientation: PanoOrientation,
): number {
  const aspect = orientation === 'landscape' ? { w: 3, h: 2 } : { w: 2, h: 3 }
  const { pxW, pxH } = mpToPixelDimensions(megapixels, aspect)
  const totalW = pxW * (1 + (framesPerRow - 1) * (1 - overlap))
  const totalH = pxH * (1 + (rows - 1) * (1 - overlap))
  return (totalW * totalH) / 1e6
}

export function planPanorama(input: PanoInput): PanoPlan {
  const fov = calcFOV(input.focalLength, input.cropFactor)
  const frameFovH = input.orientation === 'landscape' ? fov.horizontal : fov.vertical
  const frameFovV = input.orientation === 'landscape' ? fov.vertical : fov.horizontal

  const framesPerRow = framesForArc(input.targetHDeg, frameFovH, input.overlap)
  return {
    frameFovH,
    frameFovV,
    incrementH: rotationIncrement(frameFovH, input.overlap),
    framesPerRow,
    totalFrames: framesPerRow * input.rows,
    coverageH: arcCoverage(framesPerRow, frameFovH, input.overlap),
    coverageV: arcCoverage(input.rows, frameFovV, input.overlap),
    stitchedMp: stitchedMegapixels(input.megapixels, framesPerRow, input.rows, input.overlap, input.orientation),
  }
}

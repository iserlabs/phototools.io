import { modelLayout, blurMmToPx, MAX_BLUR_PX, BLUR_VISIBLE_THRESHOLD_PX } from '@/lib/math/projection'
import { calcDefocusBlur } from '@/lib/math/dof'
import type { DofSubject } from '@/lib/data/dofSimulator/types'
import type { DofDerived } from '../state/useDofDerived'
import type { OpticsState } from '../state/useOptics'

/** Caption bar height at scale 1, in px (48 * scale at export scale). */
const CAPTION_H_BASE = 48

/** The subset of `DofDerived` the export layout reads — same projection as `ModelLayerProps`. */
export type ExportDerived = Pick<DofDerived, 'figureFrac' | 'cropLevel' | 'sensorWMm'>

/** The subset of `OpticsState` the export layout reads — same projection as `ModelLayerProps`. */
export type ExportOptics = Pick<OpticsState, 'focalLength' | 'aperture' | 'distanceM'>

export interface ExportSlice {
  src: string
  /** Left edge (px) of the horizontal centering box at export scale. */
  x: number
  /** Top edge (px) at export scale — final, ready to draw. */
  y: number
  /** Width (px) of the horizontal centering box at export scale. */
  w: number
  /** Height (px) at export scale — final, ready to draw. */
  h: number
  /** CSS-filter-style blur radius (px) at export scale; 0 = no blur. */
  blurPx: number
}

export interface ExportLayout {
  canvasW: number
  canvasH: number
  captionH: number
  slices: ExportSlice[]
}

/**
 * Pure export-canvas layout. Mirrors `ModelLayer`'s on-screen subject
 * positioning and per-slice defocus blur exactly (same `modelLayout` /
 * `calcDefocusBlur` / `blurMmToPx` calls, same 24px cap + 0.5px visibility
 * threshold), scaled by `scale` (the export hook renders at 2x the live
 * viewport). No image loading here — a slice's true draw width depends on
 * its asset's intrinsic aspect ratio, which is only known once the image
 * element has loaded in the browser. Instead each slice carries a
 * horizontal centering box (`x`, `w`, spanning the full canvas width, same
 * as ModelLayer's `left: 50%; width: auto; transform: translateX(-50%)`);
 * the drawing step centers the loaded image within that box using the
 * final `h`.
 */
export function computeExportLayout(
  viewportPx: { w: number; h: number },
  subject: DofSubject,
  derived: ExportDerived,
  optics: ExportOptics,
  scale: number,
): ExportLayout {
  const captionH = CAPTION_H_BASE * scale
  const canvasW = viewportPx.w * scale
  const canvasH = viewportPx.h * scale + captionH

  const crop = subject.crops[derived.cropLevel]
  const figurePx = derived.figureFrac * viewportPx.h
  const layout = modelLayout(figurePx, viewportPx.h, crop.eyeLineRatio)

  const slices: ExportSlice[] = crop.slices.map((slice) => {
    const blurMm = calcDefocusBlur({
      focalLength: optics.focalLength,
      aperture: optics.aperture,
      focusDistance: optics.distanceM,
      targetDistance: optics.distanceM + slice.depthOffsetMm / 1000,
    })
    const blurPxRaw = blurMmToPx(blurMm, derived.sensorWMm, viewportPx.w)
    const blurPx = (blurPxRaw > BLUR_VISIBLE_THRESHOLD_PX ? Math.min(blurPxRaw, MAX_BLUR_PX) : 0) * scale

    return {
      src: slice.src,
      x: 0,
      y: layout.topPx * scale,
      w: canvasW,
      h: layout.heightPx * scale,
      blurPx,
    }
  })

  return { canvasW, canvasH, captionH, slices }
}

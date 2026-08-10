'use client'

import { useState, type CSSProperties } from 'react'
import { calcDefocusBlur } from '@/lib/math/dof'
import { modelLayout, blurMmToPx, MAX_BLUR_PX, BLUR_VISIBLE_THRESHOLD_PX } from '@/lib/math/projection'
import type { DofSubject, SubjectSlice } from '@/lib/data/dofSimulator/types'
import type { DofDerived } from '../state/useDofDerived'
import type { OpticsState } from '../state/useOptics'

export interface ModelLayerProps {
  subject: DofSubject
  derived: Pick<DofDerived, 'figureFrac' | 'cropLevel' | 'sensorWMm' | 'cocMm'>
  optics: Pick<OpticsState, 'focalLength' | 'aperture' | 'distanceM'>
  viewportPx: { w: number; h: number }
  /**
   * A/B split mode's divider fraction (0..1) of the full viewport width.
   * The subject is only ever rendered for set A (a B-side subject is out of
   * scope) -- when split is active, this centers it within pane A's own
   * width ([0, splitDividerPos]) instead of the full viewport's midpoint,
   * so it visually reads as belonging to the A pane rather than straddling
   * the divider (dof-simulator-rebuild final fix wave re-review, item 4).
   * Omit/undefined outside split mode (centers at the full-width midpoint).
   */
  splitDividerPos?: number
}

function sliceStyle(
  slice: SubjectSlice,
  index: number,
  sliceCount: number,
  layout: { heightPx: number; topPx: number },
  optics: ModelLayerProps['optics'],
  sensorWMm: number,
  viewportWPx: number,
  leftPct: number,
): CSSProperties {
  const blurMm = calcDefocusBlur({
    focalLength: optics.focalLength,
    aperture: optics.aperture,
    focusDistance: optics.distanceM,
    targetDistance: optics.distanceM + slice.depthOffsetMm / 1000,
  })
  const blurPx = blurMmToPx(blurMm, sensorWMm, viewportWPx)

  return {
    position: 'absolute',
    left: `${leftPct}%`,
    top: layout.topPx,
    height: layout.heightPx,
    width: 'auto',
    transform: 'translateX(-50%)',
    zIndex: sliceCount - index,
    filter: blurPx > BLUR_VISIBLE_THRESHOLD_PX ? `blur(${Math.min(blurPx, MAX_BLUR_PX)}px)` : '',
  }
}

/**
 * DOM subject layer composited above the WebGL background canvas. Renders the
 * active crop level's depth slices as absolutely-positioned, individually
 * blurred `<img>`s (near→far, manifest order); falls back to the single
 * unsliced crop image if any slice fails to load.
 */
export function ModelLayer({ subject, derived, optics, viewportPx, splitDividerPos }: ModelLayerProps) {
  const [failed, setFailed] = useState(false)

  const crop = subject.crops[derived.cropLevel]
  const figurePx = derived.figureFrac * viewportPx.h
  const layout = modelLayout(figurePx, viewportPx.h, crop.eyeLineRatio)
  // Pane A spans [0, splitDividerPos] of the full width, so its own midpoint
  // is splitDividerPos/2 -- e.g. an even 0.5 divider centers the subject at
  // 25% of the full viewport width, squarely inside the left pane.
  const leftPct = splitDividerPos !== undefined ? splitDividerPos * 50 : 50

  if (failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={crop.src}
        alt=""
        aria-hidden
        style={{
          position: 'absolute',
          left: `${leftPct}%`,
          top: layout.topPx,
          height: layout.heightPx,
          width: 'auto',
          transform: 'translateX(-50%)',
        }}
      />
    )
  }

  return (
    <>
      {crop.slices.map((slice, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slice.src}
          src={slice.src}
          alt=""
          aria-hidden
          onError={() => setFailed(true)}
          style={sliceStyle(slice, index, crop.slices.length, layout, optics, derived.sensorWMm, viewportPx.w, leftPct)}
        />
      ))}
    </>
  )
}

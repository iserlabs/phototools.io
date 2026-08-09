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
  side?: 'a' | 'b'
}

function sliceStyle(
  slice: SubjectSlice,
  index: number,
  sliceCount: number,
  layout: { heightPx: number; topPx: number },
  optics: ModelLayerProps['optics'],
  sensorWMm: number,
  viewportWPx: number,
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
    left: '50%',
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
export function ModelLayer({ subject, derived, optics, viewportPx }: ModelLayerProps) {
  const [failed, setFailed] = useState(false)

  const crop = subject.crops[derived.cropLevel]
  const figurePx = derived.figureFrac * viewportPx.h
  const layout = modelLayout(figurePx, viewportPx.h, crop.eyeLineRatio)

  if (failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={crop.src}
        alt=""
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
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
          style={sliceStyle(slice, index, crop.slices.length, layout, optics, derived.sensorWMm, viewportPx.w)}
        />
      ))}
    </>
  )
}

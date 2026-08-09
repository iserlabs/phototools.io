'use client'

import { useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Viewport } from './viewport/Viewport'
import { useViewportSize } from './viewport/useViewportSize'
import { ModelLayer } from './viewport/ModelLayer'
import { BokehInset } from './viewport/BokehInset'
import { AbDivider } from './viewport/AbDivider'
import { useApertureSweep } from './viewport/useApertureSweep'
import type { RenderSide } from './viewport/useRenderer'
import { uvRectForAspect } from './viewport/webgl/glTexture'
import { useImageExport } from './export/useImageExport'
import { DofRulerConnected } from './ruler/DofRulerConnected'
import { blurMmToPx, MAX_BLUR_PX } from '@/lib/math/projection'
import { formatAperture } from '@/lib/math/aperture'
import { formatMm, formatDistance } from './state/formatters'
import type { DofStateApi } from './state/useDofState'
import type { DofSubject, DofBackground } from '@/lib/data/dofSimulator/types'
import styles from './DofSimulator.module.css'

// Native aspect ratio (w/h) the background renders were generated at — every
// `-landscape.webp` shares this ratio, `-portrait.webp` its reciprocal. Used
// to letterbox/crop the WebGL texture onto the current sensor's aspect
// (uvRectForAspect) instead of stretching it when they don't match.
const BG_ASSET_ASPECT = 1920 / 1288

interface CenterStageProps {
  dofState: DofStateApi
  subject: DofSubject
  background: DofBackground
  onDistanceChange(v: number): void
}

/** Viewport + subject overlay + A/B divider + sweep/export toolbar + ruler. */
export function CenterStage({ dofState, subject, background, onDistanceChange }: CenterStageProps) {
  const t = useTranslations('toolUI.dof-simulator')
  const { optics, appearance, uiPrefs, ab, derived, derivedB, bokeh } = dofState
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const viewportPx = useViewportSize(overlayRef)

  const viewAspect = derived.sensorWMm / derived.sensorHMm
  const texAspect = appearance.orientation === 'landscape' ? BG_ASSET_ASPECT : 1 / BG_ASSET_ASPECT
  const uvRect = useMemo(() => uvRectForAspect(texAspect, viewAspect), [texAspect, viewAspect])

  const sideA: RenderSide = useMemo(
    () => ({ blurRadiusFrac: derived.backgroundBlurMm / derived.sensorWMm, bokeh, uvRect }),
    [derived.backgroundBlurMm, derived.sensorWMm, bokeh, uvRect],
  )
  const sideB: RenderSide | null = useMemo(() => {
    if (ab.mode === 'off' || !derivedB) return null
    return { blurRadiusFrac: derivedB.backgroundBlurMm / derivedB.sensorWMm, bokeh, uvRect }
  }, [ab.mode, derivedB, bokeh, uvRect])

  const fallbackBlurPx = Math.min(MAX_BLUR_PX, blurMmToPx(derived.backgroundBlurMm, derived.sensorWMm, viewportPx.w))

  const captionText = `${formatMm(derived.effectiveFl)} · ${formatAperture(optics.aperture)} · ${formatDistance(optics.distanceM, uiPrefs.imperial)} · ${derived.sensor.name} — phototools.io`
  const exporter = useImageExport({ canvasRef, subject, derived, optics, viewportPx, captionText })
  const sweep = useApertureSweep(optics.setAperture)

  return (
    <div className={styles.centerStage}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${sweep.playing ? styles.toolbarBtnActive : ''}`}
          onClick={sweep.toggle}
          aria-pressed={sweep.playing}
        >
          {sweep.playing ? t('sweepStop') : t('sweepPlay')}
        </button>
        <button
          type="button"
          className={styles.toolbarBtn}
          onClick={exporter.exportPng}
          disabled={exporter.busy || viewportPx.w === 0}
        >
          {exporter.busy ? t('exportImageBusy') : t('exportImage')}
        </button>
      </div>

      <div className={styles.viewportWrap}>
        <Viewport
          canvasRef={canvasRef}
          background={background}
          orientation={appearance.orientation}
          viewAspect={viewAspect}
          sideA={sideA}
          sideB={sideB}
          dividerPos={ab.dividerPos}
          fallbackBlurPx={fallbackBlurPx}
        >
          <div ref={overlayRef} className={styles.overlayLayer}>
            {viewportPx.w > 0 && viewportPx.h > 0 && (
              <ModelLayer subject={subject} derived={derived} optics={optics} viewportPx={viewportPx} />
            )}
            <BokehInset bokeh={bokeh} blurPx={fallbackBlurPx} />
            {ab.mode !== 'off' && <AbDivider pos={ab.dividerPos} onChange={ab.setDividerPos} />}
          </div>
        </Viewport>
      </div>

      <DofRulerConnected
        distanceM={optics.distanceM}
        nearFocus={derived.dof.nearFocus}
        farFocus={derived.dof.farFocus}
        hyperfocal={derived.dof.hyperfocal}
        onDistanceChange={onDistanceChange}
      />
    </div>
  )
}

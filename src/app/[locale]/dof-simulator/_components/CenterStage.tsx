'use client'

import { useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Viewport } from './viewport/Viewport'
import { useViewportSize } from './viewport/useViewportSize'
import { ModelLayer } from './viewport/ModelLayer'
import { BokehInset } from './viewport/BokehInset'
import { AbDivider } from './viewport/AbDivider'
import { useApertureSweep } from './viewport/useApertureSweep'
import type { RenderSide, RendererApi } from './viewport/useRenderer'
import { uvRectForAspect } from './viewport/webgl/glTexture'
import { useImageExport } from './export/useImageExport'
import { DofRulerConnected } from './ruler/DofRulerConnected'
import { blurMmToPx, MAX_BLUR_PX } from '@/lib/math/projection'
import { formatAperture } from '@/lib/math/aperture'
import { formatMm, formatDistance } from './state/formatters'
import type { DofStateApi } from './state/useDofState'
import type { OpticsState } from './state/useOptics'
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

/**
 * Optics as the subject-blur math (ModelLayer's per-slice `calcDefocusBlur`,
 * and `computeExportLayout`'s mirror of it) expects them: the teleconverter-
 * adjusted `effectiveFl` substituted for the raw `optics.focalLength`, per
 * `ModelLayerProps`' documented contract ("effectiveFl passed as
 * focalLength", Task 17). `derived.backgroundBlurMm`/`derived.dof` already
 * key off `effectiveFl` internally — the subject's per-slice defocus blur
 * must use the same value, or engaging a teleconverter visibly under-blurs
 * the subject relative to the correctly-blurred background (on screen and
 * in the exported PNG).
 */
export function subjectOptics(
  optics: Pick<OpticsState, 'aperture' | 'distanceM'>,
  effectiveFl: number,
): Pick<OpticsState, 'focalLength' | 'aperture' | 'distanceM'> {
  return { focalLength: effectiveFl, aperture: optics.aperture, distanceM: optics.distanceM }
}

/** Viewport + subject overlay + A/B divider + sweep/export toolbar + ruler. */
export function CenterStage({ dofState, subject, background, onDistanceChange }: CenterStageProps) {
  const t = useTranslations('toolUI.dof-simulator')
  const { optics, appearance, uiPrefs, ab, derived, derivedB, bokeh } = dofState
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const viewportPx = useViewportSize(overlayRef)
  // Tracks the WebGL renderer's status so Export can be disabled once the
  // fallback/error path unmounts <canvas> — exporting from that state used to
  // throw with no visible feedback (dof-simulator-rebuild final fix wave, B6).
  const [viewportStatus, setViewportStatus] = useState<RendererApi['status']>('loading')
  const canvasUnavailable = viewportStatus === 'fallback' || viewportStatus === 'error'

  const viewAspect = derived.sensorWMm / derived.sensorHMm
  const texAspect = appearance.orientation === 'landscape' ? BG_ASSET_ASPECT : 1 / BG_ASSET_ASPECT
  const uvRect = useMemo(() => uvRectForAspect(texAspect, viewAspect), [texAspect, viewAspect])
  // B's own sensor can differ from A's (b_s is a live query param) — its uv
  // crop must come from ITS OWN aspect, not A's. Reusing `uvRect` here used
  // to letterbox/crop set B's background as if it shared set A's sensor,
  // which is wrong whenever they differ (A/B honesty fix, item C).
  const viewAspectB = derivedB ? derivedB.sensorWMm / derivedB.sensorHMm : viewAspect
  const uvRectB = useMemo(() => uvRectForAspect(texAspect, viewAspectB), [texAspect, viewAspectB])

  const sideA: RenderSide = useMemo(
    () => ({ blurRadiusFrac: derived.backgroundBlurMm / derived.sensorWMm, bokeh, uvRect }),
    [derived.backgroundBlurMm, derived.sensorWMm, bokeh, uvRect],
  )
  const sideB: RenderSide | null = useMemo(() => {
    if (ab.mode === 'off' || !derivedB) return null
    return { blurRadiusFrac: derivedB.backgroundBlurMm / derivedB.sensorWMm, bokeh, uvRect: uvRectB }
  }, [ab.mode, derivedB, bokeh, uvRectB])

  const fallbackBlurPx = Math.min(MAX_BLUR_PX, blurMmToPx(derived.backgroundBlurMm, derived.sensorWMm, viewportPx.w))
  const modelOptics = useMemo(
    () => subjectOptics(optics, derived.effectiveFl),
    [optics, derived.effectiveFl],
  )

  const captionText = `${formatMm(derived.effectiveFl)} · ${formatAperture(optics.aperture)} · ${formatDistance(optics.distanceM, uiPrefs.imperial, t('distanceUnit'))} · ${derived.sensor.name} — phototools.io`
  const exporter = useImageExport({ canvasRef, subject, derived, optics: modelOptics, viewportPx, captionText })
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
          disabled={exporter.busy || viewportPx.w === 0 || canvasUnavailable}
          title={canvasUnavailable ? t('exportUnavailable') : undefined}
        >
          {exporter.busy ? t('exportImageBusy') : t('exportImage')}
        </button>
        {exporter.error && <span className={styles.toolbarError}>{t('exportFailed')}</span>}
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
          sideBySide={ab.mode === 'split'}
          fallbackBlurPx={fallbackBlurPx}
          onStatusChange={setViewportStatus}
        >
          <div ref={overlayRef} className={styles.overlayLayer}>
            {viewportPx.w > 0 && viewportPx.h > 0 && (
              <ModelLayer subject={subject} derived={derived} optics={modelOptics} viewportPx={viewportPx} />
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

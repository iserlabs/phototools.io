'use client'

import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { useTranslations } from 'next-intl'
import type { DofBackground } from '@/lib/data/dofSimulator/types'
import { useRenderer, type RenderSide, type RendererApi } from './useRenderer'
import styles from './Viewport.module.css'

export interface ViewportProps {
  background: DofBackground
  orientation: 'landscape' | 'portrait'
  viewAspect: number // sensorWMm / sensorHMm from derived
  texAspect: number // native background-photo aspect (orientation-dependent)
  sideA: RenderSide
  sideB: RenderSide | null
  dividerPos: number
  /** true = genuine side-by-side (`ab.mode === 'split'`), false = a single
   *  shared frame scissored at the divider (`ab.mode === 'wipe'`). See
   *  drawFrame.ts for what each actually renders (A/B honesty, item C). */
  sideBySide?: boolean
  fallbackBlurPx: number // CSS blur for the no-WebGL path
  children?: ReactNode // ModelLayer + overlays render above the canvas
  /** Optional external ref onto the live WebGL canvas — the composition
   *  root threads this through to useImageExport, which needs to read the
   *  canvas's drawn pixels. Falls back to an internal ref when omitted. */
  canvasRef?: RefObject<HTMLCanvasElement | null>
  /** Optional: fires whenever the renderer's status changes. The composition
   *  root uses this to know when the <canvas> is unmounted (fallback/error
   *  status swaps in the static <img>) so it can disable canvas-dependent
   *  controls like PNG export instead of letting them fail silently
   *  (dof-simulator-rebuild final fix wave, B6). */
  onStatusChange?(status: RendererApi['status']): void
}

/**
 * WebGL2 background-blur canvas with a CSS-blur fallback. Always mounts the
 * canvas first (needed for useRenderer's feature-detection attempt); once the
 * renderer resolves to 'fallback' or 'error' it swaps in a static blurred
 * image plus a notice instead — same UI for both statuses, per the brief.
 */
export function Viewport({
  background, orientation, viewAspect, texAspect, sideA, sideB, dividerPos, sideBySide = false, fallbackBlurPx, children,
  canvasRef: externalCanvasRef, onStatusChange,
}: ViewportProps) {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = externalCanvasRef ?? internalCanvasRef
  const t = useTranslations('toolUI.dof-simulator')
  const bgSrc = orientation === 'portrait' ? background.srcPortrait : background.srcLandscape
  const { status } = useRenderer(canvasRef, bgSrc, texAspect, sideA, sideB, dividerPos, sideBySide)
  const showFallback = status === 'fallback' || status === 'error'

  useEffect(() => {
    onStatusChange?.(status)
  }, [status, onStatusChange])

  return (
    <div className={styles.container} style={{ aspectRatio: viewAspect }}>
      {showFallback ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bgSrc}
            alt=""
            className={styles.fallbackImg}
            style={{ filter: `blur(${fallbackBlurPx}px)` }}
          />
          <p className={styles.fallbackNotice}>{t('webglFallbackNotice')}</p>
        </>
      ) : (
        <canvas ref={canvasRef} className={styles.canvas} aria-label={background.name} role="img" />
      )}
      {children}
    </div>
  )
}

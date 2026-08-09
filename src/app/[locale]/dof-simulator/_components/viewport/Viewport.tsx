'use client'

import { useRef, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import type { DofBackground } from '@/lib/data/dofSimulator/types'
import { useRenderer, type RenderSide } from './useRenderer'
import styles from './Viewport.module.css'

export interface ViewportProps {
  background: DofBackground
  orientation: 'landscape' | 'portrait'
  viewAspect: number // sensorWMm / sensorHMm from derived
  sideA: RenderSide
  sideB: RenderSide | null
  dividerPos: number
  fallbackBlurPx: number // CSS blur for the no-WebGL path
  children?: ReactNode // ModelLayer + overlays render above the canvas
}

/**
 * WebGL2 background-blur canvas with a CSS-blur fallback. Always mounts the
 * canvas first (needed for useRenderer's feature-detection attempt); once the
 * renderer resolves to 'fallback' or 'error' it swaps in a static blurred
 * image plus a notice instead — same UI for both statuses, per the brief.
 */
export function Viewport({
  background, orientation, viewAspect, sideA, sideB, dividerPos, fallbackBlurPx, children,
}: ViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const t = useTranslations('toolUI.dof-simulator')
  const bgSrc = orientation === 'portrait' ? background.srcPortrait : background.srcLandscape
  const { status } = useRenderer(canvasRef, bgSrc, sideA, sideB, dividerPos)
  const showFallback = status === 'fallback' || status === 'error'

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

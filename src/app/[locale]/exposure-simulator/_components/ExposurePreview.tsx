'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { EXPOSURE_SCENES } from '@/lib/data/exposureScenes'
import { useExposureRenderer } from './useExposureRenderer'
import styles from './ExposurePreview.module.css'

interface ExposurePreviewProps {
  aperture: number
  shutterSpeed: number
  iso: number
}

export function ExposurePreview({ aperture, shutterSpeed, iso }: ExposurePreviewProps) {
  const t = useTranslations('toolUI.exposure-simulator')
  const [sceneIdx, setSceneIdx] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const currentScene = EXPOSURE_SCENES[sceneIdx]
  const { isLoading, error } = useExposureRenderer(
    canvasRef,
    currentScene.assets,
    aperture,
    shutterSpeed,
    iso
  )

  return (
    <div className={styles.canvasArea}>
      <div className={styles.topbar}>
        <div className={styles.sceneStrip}>
          <span className={styles.sceneStripLabel}>{t('scene')}</span>
          {EXPOSURE_SCENES.map((scene, idx) => {
            const label = t(scene.labelKey as Parameters<typeof t>[0])
            return (
            <button
              key={scene.id}
              className={`${styles.sceneThumb} ${idx === sceneIdx ? styles.sceneThumbActive : ''}`}
              onClick={() => setSceneIdx(idx)}
              aria-label={`Select ${label} scene`}
              title={label}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={scene.assets.photo}
                alt={label}
                width={48}
                height={32}
                loading="lazy"
                decoding="async"
              />
            </button>
            )
          })}
        </div>
      </div>

      <div className={styles.canvasMain}>
        {error ? (
          <div className={styles.fallback}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentScene.assets.photo}
              alt={t(currentScene.labelKey as Parameters<typeof t>[0])}
              className={styles.fallbackImg}
              decoding="async"
            />
            <p>{error}. {t('imageEffectsUnavailable')}</p>
          </div>
        ) : isLoading ? (
          <div className={styles.loading}>{t('loadingScene')}</div>
        ) : null}
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          style={{ display: error || isLoading ? 'none' : 'block' }}
        />
      </div>
    </div>
  )
}

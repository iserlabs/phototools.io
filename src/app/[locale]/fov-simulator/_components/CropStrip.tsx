'use client'

import { useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import type { LensConfig } from '@/lib/types'
import type { Orientation } from './types'
import type { OverlayOffsets } from './Canvas'
import { LENS_COLORS, LENS_LABELS } from '@/lib/data/fovSimulator'
import { calcFOV, calcCropRatio } from '@/lib/math/fov'
import { getSensor } from '@/lib/data/sensors'
import styles from './CropStrip.module.css'

/**
 * Compute the cover-fit source region for a given image drawn into a canvas.
 * Returns the visible region of the source image (sx, sy, sw, sh)
 * and the scale factor from canvas pixels to image pixels.
 */
function coverFitMapping(imgW: number, imgH: number, canvasW: number, canvasH: number) {
  const imgAspect = imgW / imgH
  const canvasAspect = canvasW / canvasH
  let sx: number, sy: number, sw: number, sh: number
  if (imgAspect > canvasAspect) {
    // Image is wider — crop sides
    sh = imgH
    sw = sh * canvasAspect
    sx = (imgW - sw) / 2
    sy = 0
  } else {
    // Image is taller — crop top/bottom
    sw = imgW
    sh = sw / canvasAspect
    sx = 0
    sy = (imgH - sh) / 2
  }
  // scale: how many image pixels per canvas pixel
  const scale = sw / canvasW
  return { sx, sy, sw, sh, scale }
}

interface CropThumbProps {
  lens: LensConfig
  orientation: Orientation
  color: string
  lensIndex: number
  isActive: boolean
  onSelect: () => void
  offset: { dx: number; dy: number }
  cleanCanvasRef: React.RefObject<HTMLCanvasElement | null>
  sourceImageRef: React.RefObject<HTMLImageElement | null>
  sourceFocalLength?: number | null
}

function CropThumb({ lens, orientation, color, lensIndex, onSelect, offset, cleanCanvasRef, sourceImageRef, sourceFocalLength }: CropThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const renderRef = useRef<() => void>(() => {})

  const render = () => {
    const canvas = canvasRef.current
    const mainCanvas = cleanCanvasRef.current
    const img = sourceImageRef.current
    if (!canvas || !mainCanvas) return
    if (mainCanvas.width === 0 || mainCanvas.height === 0) return

    const parent = canvas.parentElement
    if (!parent) return

    const dpr = window.devicePixelRatio || 1
    const displayW = parent.offsetWidth
    const displayH = parent.offsetHeight
    canvas.width = displayW * dpr
    canvas.height = displayH * dpr

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const sensor = getSensor(lens.sensorId)
    const fov = calcFOV(lens.focalLength, sensor.cropFactor)
    const isPortrait = orientation === 'portrait'

    const mainW = mainCanvas.width
    const mainH = mainCanvas.height

    const refFov = sourceFocalLength ? calcFOV(sourceFocalLength, 1.0) : calcFOV(14, 1.0)

    const ratioW = calcCropRatio(
      isPortrait ? fov.vertical : fov.horizontal,
      isPortrait ? refFov.vertical : refFov.horizontal,
    )
    const ratioH = calcCropRatio(
      isPortrait ? fov.horizontal : fov.vertical,
      isPortrait ? refFov.horizontal : refFov.vertical,
    )

    if (ratioW > 1.01 || ratioH > 1.01) {
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--bg-primary').trim() || '#0d0d0d'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const scale = Math.max(ratioW, ratioH)
      const innerW = canvas.width / scale
      const innerH = canvas.height / scale
      const innerX = (canvas.width - innerW) / 2
      const innerY = (canvas.height - innerH) / 2
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, innerX, innerY, innerW, innerH)
      } else {
        ctx.drawImage(mainCanvas, 0, 0, mainW, mainH, innerX, innerY, innerW, innerH)
      }
      return
    }

    // Rect position in canvas coordinates
    const rectW = mainW * ratioW
    const rectH = mainH * ratioH
    const rectX = (mainW - rectW) / 2 + offset.dx
    const rectY = (mainH - rectH) / 2 + offset.dy

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // If we have the original hi-res image, crop from it for better quality
    if (img && img.complete && img.naturalWidth > 0) {
      const { sx, sy, scale } = coverFitMapping(img.naturalWidth, img.naturalHeight, mainW, mainH)
      // Map canvas-coordinate rect to image-coordinate rect
      const imgRectX = sx + rectX * scale
      const imgRectY = sy + rectY * scale
      const imgRectW = rectW * scale
      const imgRectH = rectH * scale
      ctx.drawImage(img, imgRectX, imgRectY, imgRectW, imgRectH, 0, 0, canvas.width, canvas.height)
    } else {
      // Fallback: copy from canvas (lower res)
      ctx.drawImage(mainCanvas, rectX, rectY, rectW, rectH, 0, 0, canvas.width, canvas.height)
    }
  }

  renderRef.current = render

  useEffect(render, [lens, orientation, offset, cleanCanvasRef, sourceImageRef, sourceFocalLength, color])

  useEffect(() => {
    const cleanCanvas = cleanCanvasRef.current
    if (!cleanCanvas) return
    const handler = () => renderRef.current()
    cleanCanvas.addEventListener('draw', handler)
    return () => cleanCanvas.removeEventListener('draw', handler)
  }, [cleanCanvasRef])

  return (
    <button
      className={styles.thumb}
      style={{ borderColor: color }}
      onClick={onSelect}
      title={`Lens ${LENS_LABELS[lensIndex]} — ${lens.focalLength}mm`}
    >
      <canvas ref={canvasRef} />
      <span className={styles.thumbLabel}>{LENS_LABELS[lensIndex]} — {lens.focalLength}mm</span>
    </button>
  )
}

interface CropStripProps {
  lenses: LensConfig[]
  imageIndex: number
  orientation: Orientation
  activeLens: number
  onSelectLens: (index: number) => void
  offsets: OverlayOffsets
  expanded: boolean
  onToggleExpand: () => void
  cleanCanvasRef: React.RefObject<HTMLCanvasElement | null>
  sourceImageRef: React.RefObject<HTMLImageElement | null>
  sourceFocalLength?: number | null
}

export function CropStrip({ lenses, orientation, activeLens, onSelectLens, offsets, expanded, onToggleExpand, cleanCanvasRef, sourceImageRef, sourceFocalLength }: CropStripProps) {
  const t = useTranslations('toolUI.fov-simulator')
  return (
    <div className={`${styles.strip} ${expanded ? styles.stripExpanded : ''}`}>
      <div className={styles.stripHeader}>
        <span className={styles.label}>{t('cropView')}</span>
        <button className={styles.expandBtn} onClick={onToggleExpand} title={expanded ? t('collapse') : t('expand')}>
          {expanded ? '▾' : '▴'}
        </button>
      </div>
      <div className={styles.thumbsWrap}>
        <div className={styles.thumbs}>
          {lenses.map((lens, i) => (
            <CropThumb
              key={i}
              lens={lens}
              orientation={orientation}
              color={LENS_COLORS[i]}
              lensIndex={i}
              isActive={activeLens === i}
              onSelect={() => onSelectLens(i)}
              offset={offsets[i] ?? { dx: 0, dy: 0 }}
              cleanCanvasRef={cleanCanvasRef}
              sourceImageRef={sourceImageRef}
              sourceFocalLength={sourceFocalLength}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

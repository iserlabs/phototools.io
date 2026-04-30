'use client'

import { useState, useCallback } from 'react'
import * as Sentry from '@sentry/nextjs'
import { useTranslations } from 'next-intl'
import { computeExportDimensions, drawSolidBorder, drawGradientBorder, drawTextureBorder, drawInnerMat, drawShadow } from '@/lib/math/frame'
import { transferExif } from '@/lib/utils/exif'
import { renderTiledExport, TILED_EXPORT_THRESHOLD } from '@/lib/utils/image-export'
import {
  drawRuleOfThirds, drawGoldenRatio, drawGoldenSpiral, drawGoldenDiagonal,
  drawDiagonalLines, drawCenterCross, drawSquareGrid, drawTriangles,
  GOLDEN_RATIO,
} from '@/lib/math/grid'
import type { FrameConfig, CropState, GridType, GridOptions } from './types'
import { thicknessToPx } from './types'
import styles from './ExportDialog.module.css'

interface ExportDialogProps {
  image: HTMLImageElement
  crop: CropState | null
  frameConfig: FrameConfig
  activeGrids: GridType[]
  gridOptions: GridOptions
  gridOffset?: { x: number; y: number }
  gridDisplaySize?: { width: number; height: number }
  originalFile: File
  originalMimeType: string
  onClose: () => void
}

type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number, opts: GridOptions) => void

const GRID_DRAW_MAP: Record<GridType, DrawFn> = {
  'rule-of-thirds': (ctx, w, h) => drawRuleOfThirds(ctx, w, h),
  'golden-ratio': (ctx, w, h) => drawGoldenRatio(ctx, w, h),
  'golden-spiral': (ctx, w, h, opts) => drawGoldenSpiral(ctx, w, h, opts.spiralRotation),
  'golden-diagonal': (ctx, w, h, opts) => drawGoldenDiagonal(ctx, w, h, opts.spiralRotation),
  'diagonal-lines': (ctx, w, h) => drawDiagonalLines(ctx, w, h),
  'center-cross': (ctx, w, h) => drawCenterCross(ctx, w, h),
  'square-grid': (ctx, w, h, opts) => drawSquareGrid(ctx, w, h, opts.gridDensity),
  'triangles': (ctx, w, h) => drawTriangles(ctx, w, h),
}

function getLinePositions(gridType: GridType, w: number, h: number, opts: GridOptions) {
  switch (gridType) {
    case 'rule-of-thirds': return { v: [0, w / 3, 2 * w / 3], h: [0, h / 3, 2 * h / 3] }
    case 'golden-ratio': { const pw = w / GOLDEN_RATIO, ph = h / GOLDEN_RATIO; return { v: [0, w - pw, pw], h: [0, h - ph, ph] } }
    case 'center-cross': return { v: [0, w / 2], h: [0, h / 2] }
    case 'square-grid': return {
      v: Array.from({ length: opts.gridDensity }, (_, i) => (i * w) / opts.gridDensity),
      h: Array.from({ length: opts.gridDensity }, (_, i) => (i * h) / opts.gridDensity),
    }
    default: return null
  }
}

function drawGridOnExport(
  ctx: CanvasRenderingContext2D, gridType: GridType, drawFn: DrawFn,
  oX: number, oY: number, gw: number, gh: number, ox: number, oy: number, opts: GridOptions,
) {
  const positions = ox === 0 && oy === 0 ? null : getLinePositions(gridType, gw, gh, opts)
  if (!positions && (ox === 0 && oy === 0)) {
    ctx.save(); ctx.translate(oX, oY); ctx.beginPath(); drawFn(ctx, gw, gh, opts); ctx.restore(); return
  }
  if (positions) {
    ctx.beginPath()
    for (const b of positions.v) { const x = ((b + ox) % gw + gw) % gw; if (x > 0.5) { ctx.moveTo(oX + x, oY); ctx.lineTo(oX + x, oY + gh) } }
    for (const b of positions.h) { const y = ((b + oy) % gh + gh) % gh; if (y > 0.5) { ctx.moveTo(oX, oY + y); ctx.lineTo(oX + gw, oY + y) } }
    ctx.stroke()
  } else {
    const px = ((ox % gw) + gw) % gw, py = ((oy % gh) + gh) % gh
    for (let dx = -1; dx <= 0; dx++) for (let dy = -1; dy <= 0; dy++) {
      ctx.save(); ctx.translate(oX + px + dx * gw, oY + py + dy * gh); ctx.beginPath(); drawFn(ctx, gw, gh, opts); ctx.restore()
    }
  }
}

export function ExportDialog({
  image, crop, frameConfig, activeGrids, gridOptions,
  gridOffset, gridDisplaySize, originalFile, originalMimeType, onClose,
}: ExportDialogProps) {
  const t = useTranslations('toolUI.frame-studio')
  const [includeGrid, setIncludeGrid] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [closing, setClosing] = useState(false)

  const handleClose = useCallback(() => { setClosing(true); setTimeout(onClose, 150) }, [onClose])

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const sx = crop?.x ?? 0, sy = crop?.y ?? 0
      const sw = crop?.width ?? image.naturalWidth, sh = crop?.height ?? image.naturalHeight
      const bw = frameConfig.borderWidth
      const matW = frameConfig.innerMatEnabled ? frameConfig.innerMatWidth : 0
      const { width: exportW, height: exportH } = computeExportDimensions(sw, sh, bw, matW)

      const drawScene = (ctx: CanvasRenderingContext2D) => {
        if (frameConfig.shadowEnabled && bw > 0) {
          drawShadow(ctx, exportW, exportH, bw, frameConfig.cornerRadius, {
            color: frameConfig.shadowColor, blur: frameConfig.shadowBlur,
            offsetX: frameConfig.shadowOffsetX, offsetY: frameConfig.shadowOffsetY,
          })
        }
        if (bw > 0) {
          if (frameConfig.fillType === 'solid') drawSolidBorder(ctx, exportW, exportH, frameConfig.solidColor, frameConfig.cornerRadius)
          else if (frameConfig.fillType === 'gradient') drawGradientBorder(ctx, exportW, exportH, frameConfig.gradientColor1, frameConfig.gradientColor2, frameConfig.gradientDirection, frameConfig.cornerRadius)
          else drawTextureBorder(ctx, exportW, exportH, frameConfig.texture, frameConfig.cornerRadius)
        }
        if (frameConfig.innerMatEnabled && matW > 0) drawInnerMat(ctx, exportW, exportH, bw, frameConfig.cornerRadius, matW, frameConfig.innerMatColor)
        const imgX = bw + matW, imgY = bw + matW
        ctx.drawImage(image, sx, sy, sw, sh, imgX, imgY, sw, sh)
        if (includeGrid && activeGrids.length > 0) {
          ctx.save(); ctx.beginPath(); ctx.rect(imgX, imgY, sw, sh); ctx.clip()
          const scX = gridDisplaySize && gridDisplaySize.width > 0 ? sw / gridDisplaySize.width : 1
          const scY = gridDisplaySize && gridDisplaySize.height > 0 ? sh / gridDisplaySize.height : 1
          ctx.strokeStyle = gridOptions.color; ctx.globalAlpha = gridOptions.opacity; ctx.lineWidth = thicknessToPx(gridOptions.thickness)
          for (const gt of activeGrids) { const fn = GRID_DRAW_MAP[gt]; if (fn) drawGridOnExport(ctx, gt, fn, imgX, imgY, sw, sh, (gridOffset?.x ?? 0) * scX, (gridOffset?.y ?? 0) * scY, gridOptions) }
          ctx.restore()
        }
      }

      let blob: Blob | null
      if (exportW * exportH > TILED_EXPORT_THRESHOLD) {
        blob = await renderTiledExport(exportW, exportH, drawScene, originalMimeType)
      } else {
        const canvas = document.createElement('canvas')
        canvas.width = exportW; canvas.height = exportH
        const ctx = canvas.getContext('2d')!
        drawScene(ctx)
        blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, originalMimeType, 1))
      }
      if (!blob) {
        Sentry.captureMessage('Frame Studio export: canvas.toBlob returned null', {
          level: 'error',
          tags: { module: 'frame-studio', op: 'export' },
        })
        return
      }

      const originalBuffer = await originalFile.arrayBuffer()
      blob = await transferExif(originalBuffer, blob, originalMimeType)

      const baseName = originalFile.name.replace(/\.[^.]+$/, '')
      const ext = originalFile.name.match(/\.[^.]+$/)?.[0] ?? '.png'
      const fileName = `${baseName}_edited${ext}`
      const file = new File([blob], fileName, { type: originalMimeType })

      let shared = false
      if (typeof navigator.share === 'function') {
        try { await navigator.share({ files: [file] }); shared = true }
        catch (e) { if (e instanceof DOMException && e.name === 'AbortError') shared = true }
      }
      if (!shared) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = fileName
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 30000)
      }
      onClose()
    } finally { setExporting(false) }
  }, [image, crop, frameConfig, includeGrid, activeGrids, gridOptions, gridOffset, gridDisplaySize, originalFile, originalMimeType, onClose])

  return (
    <div className={`${styles.overlay} ${closing ? styles.closing : ''}`} onClick={handleClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{t('exportPhoto')}</h3>
        <div className={styles.info}>
          <span>{t('format')} {originalMimeType.split('/')[1]?.toUpperCase() ?? 'PNG'}</span>
          <span>{t('quality')} {t('qualityMaximum')}</span>
        </div>
        {activeGrids.length > 0 && (
          <label className={styles.toggle}>
            <input type="checkbox" checked={includeGrid} onChange={(e) => setIncludeGrid(e.target.checked)} />
            <span>{t('includeGridOverlay')}</span>
          </label>
        )}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={handleClose}>{t('cancel')}</button>
          <button className={styles.exportBtn} onClick={handleExport} disabled={exporting}>
            {exporting ? t('exporting') : t('download')}
          </button>
        </div>
      </div>
    </div>
  )
}

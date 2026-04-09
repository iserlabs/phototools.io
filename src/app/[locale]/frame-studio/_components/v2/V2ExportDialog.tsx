'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { transferExif } from '@/lib/utils/exif'
import { renderTiledExport, TILED_EXPORT_THRESHOLD } from '@/lib/utils/image-export'
import { computeExportDimensions, drawSolidBorder, drawGradientBorder, drawTextureBorder, drawInnerMat, drawShadow } from '@/lib/math/frame'
import type { FrameConfig, CropState } from '../types'
import type { AnnotationShape, TemplateConfig } from './types'
import { TEMPLATES } from './templateData'
import styles from './V2ExportDialog.module.css'

function drawAnnotationsOnCanvas(ctx: CanvasRenderingContext2D, shapes: AnnotationShape[], w: number, h: number) {
  for (const s of shapes) {
    const x1 = (s.x1 / 100) * w, y1 = (s.y1 / 100) * h
    const x2 = (s.x2 / 100) * w, y2 = (s.y2 / 100) * h
    ctx.save()
    ctx.globalAlpha = s.opacity
    ctx.strokeStyle = s.color
    ctx.fillStyle = s.color
    ctx.lineWidth = s.strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const minX = Math.min(x1, x2), minY = Math.min(y1, y2)
    const absW = Math.abs(x2 - x1), absH = Math.abs(y2 - y1)
    switch (s.tool) {
      case 'arrow': {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
        const a = Math.atan2(y2 - y1, x2 - x1), hl = Math.max(12, s.strokeWidth * 4)
        ctx.beginPath(); ctx.moveTo(x2, y2)
        ctx.lineTo(x2 - hl * Math.cos(a - 0.4), y2 - hl * Math.sin(a - 0.4))
        ctx.lineTo(x2 - hl * Math.cos(a + 0.4), y2 - hl * Math.sin(a + 0.4))
        ctx.closePath(); ctx.fill(); break
      }
      case 'circle': {
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2
        ctx.beginPath(); ctx.ellipse(cx, cy, absW / 2, absH / 2, 0, 0, Math.PI * 2); ctx.stroke(); break
      }
      case 'rect': ctx.strokeRect(minX, minY, absW, absH); break
      case 'highlight': ctx.globalAlpha = 0.25; ctx.fillRect(minX, minY, absW, absH); break
      case 'callout':
        ctx.beginPath(); ctx.arc(x1, y1, 8, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); break
    }
    ctx.restore()
  }
}

type DrawElementCtx = CanvasRenderingContext2D & {
  drawElementImage: (el: Element, dx: number, dy: number, dw: number, dh: number) => void
}

interface V2ExportDialogProps {
  image: HTMLImageElement
  crop: CropState | null
  frameConfig: FrameConfig
  annotations: AnnotationShape[]
  templateConfig: TemplateConfig
  textLayerRef: React.RefObject<HTMLDivElement | null>
  templateRef: React.RefObject<HTMLDivElement | null>
  originalFile: File
  originalMimeType: string
  mode: 'standard' | 'template'
  onClose: () => void
}

export function V2ExportDialog({
  image, crop, frameConfig, annotations, templateConfig,
  textLayerRef, templateRef, originalFile, originalMimeType, mode, onClose,
}: V2ExportDialogProps) {
  const t = useTranslations('toolUI.frame-studio')
  const [includeAnnotations, setIncludeAnnotations] = useState(true)
  const [includeText, setIncludeText] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [closing, setClosing] = useState(false)

  const handleClose = useCallback(() => { setClosing(true); setTimeout(onClose, 150) }, [onClose])

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      let blob: Blob | null

      if (mode === 'template') {
        const tpl = TEMPLATES.find(tp => tp.id === templateConfig.templateId)
        if (!tpl) return
        const { width: tW, height: tH } = tpl

        const drawScene = (ctx: CanvasRenderingContext2D) => {
          const sx = crop?.x ?? 0, sy = crop?.y ?? 0
          const sw = crop?.width ?? image.naturalWidth, sh = crop?.height ?? image.naturalHeight
          const imgAspect = sw / sh, canvasAspect = tW / tH
          let dx = 0, dy = 0, dw = tW, dh = tH
          if (imgAspect > canvasAspect) { dw = tH * imgAspect; dx = (tW - dw) / 2 }
          else { dh = tW / imgAspect; dy = (tH - dh) / 2 }
          ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
          try { (ctx as DrawElementCtx).drawElementImage(templateRef.current!, 0, 0, tW, tH) } catch { /* unsupported */ }
        }

        if (tW * tH > TILED_EXPORT_THRESHOLD) {
          blob = await renderTiledExport(tW, tH, drawScene, originalMimeType)
        } else {
          const c = document.createElement('canvas'); c.width = tW; c.height = tH
          drawScene(c.getContext('2d')!)
          blob = await new Promise<Blob | null>(r => c.toBlob(r, originalMimeType, 1))
        }
      } else {
        const sx = crop?.x ?? 0, sy = crop?.y ?? 0
        const sw = crop?.width ?? image.naturalWidth, sh = crop?.height ?? image.naturalHeight
        const bw = frameConfig.borderWidth
        const matW = frameConfig.innerMatEnabled ? frameConfig.innerMatWidth : 0
        const { width: eW, height: eH } = computeExportDimensions(sw, sh, bw, matW)

        const drawScene = (ctx: CanvasRenderingContext2D) => {
          if (frameConfig.shadowEnabled && bw > 0) {
            drawShadow(ctx, eW, eH, bw, frameConfig.cornerRadius, {
              color: frameConfig.shadowColor, blur: frameConfig.shadowBlur,
              offsetX: frameConfig.shadowOffsetX, offsetY: frameConfig.shadowOffsetY,
            })
          }
          if (bw > 0) {
            if (frameConfig.fillType === 'solid') drawSolidBorder(ctx, eW, eH, frameConfig.solidColor, frameConfig.cornerRadius)
            else if (frameConfig.fillType === 'gradient') drawGradientBorder(ctx, eW, eH, frameConfig.gradientColor1, frameConfig.gradientColor2, frameConfig.gradientDirection, frameConfig.cornerRadius)
            else drawTextureBorder(ctx, eW, eH, frameConfig.texture, frameConfig.cornerRadius)
          }
          if (frameConfig.innerMatEnabled && matW > 0) drawInnerMat(ctx, eW, eH, bw, frameConfig.cornerRadius, matW, frameConfig.innerMatColor)
          const imgX = bw + matW, imgY = bw + matW
          ctx.drawImage(image, sx, sy, sw, sh, imgX, imgY, sw, sh)
          if (includeAnnotations && annotations.length > 0) drawAnnotationsOnCanvas(ctx, annotations, eW, eH)
          if (includeText && textLayerRef.current) {
            try { (ctx as DrawElementCtx).drawElementImage(textLayerRef.current, imgX, imgY, sw, sh) } catch { /* unsupported */ }
          }
        }

        if (eW * eH > TILED_EXPORT_THRESHOLD) {
          blob = await renderTiledExport(eW, eH, drawScene, originalMimeType)
        } else {
          const c = document.createElement('canvas'); c.width = eW; c.height = eH
          drawScene(c.getContext('2d')!)
          blob = await new Promise<Blob | null>(r => c.toBlob(r, originalMimeType, 1))
        }
      }

      if (!blob) { console.error('Export failed: could not create image blob'); return }
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
  }, [image, crop, frameConfig, annotations, templateConfig, textLayerRef, templateRef, includeAnnotations, includeText, originalFile, originalMimeType, mode, onClose])

  return (
    <div className={`${styles.overlay} ${closing ? styles.closing : ''}`} onClick={handleClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <h3 className={styles.title}>{t('exportV2')}</h3>
        <div className={styles.info}>
          <span>{t('exportMode')} {mode === 'template' ? t('exportTemplate') : t('exportStandard')}</span>
          <span>{t('format')} {originalMimeType.split('/')[1]?.toUpperCase() ?? 'PNG'}</span>
          <span>{t('quality')} {t('qualityMaximum')}</span>
        </div>
        {mode === 'standard' && annotations.length > 0 && (
          <label className={styles.toggle}>
            <input type="checkbox" checked={includeAnnotations} onChange={e => setIncludeAnnotations(e.target.checked)} />
            <span>{t('includeAnnotations')}</span>
          </label>
        )}
        {mode === 'standard' && (
          <label className={styles.toggle}>
            <input type="checkbox" checked={includeText} onChange={e => setIncludeText(e.target.checked)} />
            <span>{t('includeText')}</span>
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

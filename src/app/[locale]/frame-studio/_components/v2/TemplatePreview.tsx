'use client'

import { useRef, useEffect, useCallback } from 'react'
import { TEMPLATES } from './templateData'
import type { TemplateConfig } from './types'
import type { CropState } from '../types'
import styles from './TemplatePreview.module.css'

interface TemplatePreviewProps {
  image: HTMLImageElement
  config: TemplateConfig
  crop: CropState | null
}

export function TemplatePreview({ image, config, crop }: TemplatePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const templateRef = useRef<HTMLDivElement>(null)

  const template = TEMPLATES.find(t => t.id === config.templateId)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const tmplEl = templateRef.current
    if (!canvas || !tmplEl || !template) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const container = canvas.parentElement
    if (!container) return
    const maxW = container.clientWidth
    const maxH = container.clientHeight
    const scale = Math.min(maxW / template.width, maxH / template.height)
    const displayW = Math.round(template.width * scale)
    const displayH = Math.round(template.height * scale)

    const dpr = window.devicePixelRatio || 1
    canvas.width = displayW * dpr
    canvas.height = displayH * dpr
    canvas.style.width = `${displayW}px`
    canvas.style.height = `${displayH}px`
    ctx.scale(dpr, dpr)

    // Draw photo (cover-fit)
    const sx = crop?.x ?? 0
    const sy = crop?.y ?? 0
    const sw = crop?.width ?? image.naturalWidth
    const sh = crop?.height ?? image.naturalHeight

    const imgAspect = sw / sh
    const canvasAspect = displayW / displayH
    let drawX = 0, drawY = 0, drawW = displayW, drawH = displayH
    if (imgAspect > canvasAspect) {
      drawW = displayH * imgAspect
      drawX = (displayW - drawW) / 2
    } else {
      drawH = displayW / imgAspect
      drawY = (displayH - drawH) / 2
    }
    ctx.drawImage(image, sx, sy, sw, sh, drawX, drawY, drawW, drawH)

    // Draw HTML template overlay via drawElementImage
    try {
      (ctx as CanvasRenderingContext2D & { drawElementImage: (el: Element, dx: number, dy: number, dw: number, dh: number) => void })
        .drawElementImage(tmplEl, 0, 0, displayW, displayH)
    } catch {
      // Not supported — silent fallback
    }
  }, [image, crop, template])

  useEffect(() => {
    draw()
    const canvas = canvasRef.current
    if (!canvas) return
    const container = canvas.parentElement
    if (!container) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(container)
    return () => ro.disconnect()
  }, [draw])

  // Redraw on paint event if supported
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handler = () => draw()
    canvas.addEventListener('paint', handler)
    try { (canvas as HTMLCanvasElement & { requestPaint: () => void }).requestPaint() } catch { /* not supported */ }
    return () => canvas.removeEventListener('paint', handler)
  }, [draw])

  if (!template) return null

  return (
    <div className={styles.container}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        {...({ layoutsubtree: '' } as React.HTMLAttributes<HTMLCanvasElement>)}
      >
        <div
          ref={templateRef}
          className={styles.template}
          style={{
            width: template.width,
            height: template.height,
            '--gradient-from': config.gradientFrom,
            '--gradient-to': config.gradientTo,
            '--text-color': config.textColor,
          } as React.CSSProperties}
        >
          <div className={styles.overlay} />
          <div className={styles.content}>
            {config.title && (
              <h2 className={styles.title}>{config.title}</h2>
            )}
            {config.subtitle && (
              <p className={styles.subtitle}>{config.subtitle}</p>
            )}
            <div className={styles.branding}>phototools.io</div>
          </div>
        </div>
      </canvas>
    </div>
  )
}

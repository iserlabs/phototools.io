'use client'

import { useCallback, useRef, useState, type RefObject } from 'react'
import * as Sentry from '@sentry/nextjs'
import { downloadBlob } from '@/lib/utils/export'
import type { DofSubject } from '@/lib/data/dofSimulator/types'
import { computeExportLayout, type ExportDerived, type ExportOptics } from './exportLayout'

/** Export renders at 2x the live viewport for print-quality output. */
const EXPORT_SCALE = 2
const CAPTION_FONT_PX = 13
const CAPTION_PAD_X = 16
const CAPTION_FALLBACK_SURFACE = '#1a1a1a'
const CAPTION_FALLBACK_TEXT = '#e5e5e5'

export interface UseImageExportDeps {
  canvasRef: RefObject<HTMLCanvasElement | null>
  subject: DofSubject
  derived: ExportDerived
  optics: ExportOptics
  viewportPx: { w: number; h: number }
  /** Fully-formed caption string, e.g. "85mm · f/1.8 · 3.0m · Full Frame — phototools.io". */
  captionText: string
}

export interface UseImageExportApi {
  exportPng(): Promise<void>
  busy: boolean
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`dof-simulator export: failed to load slice image ${src}`))
    img.src = src
  })
}

/** Reads a theme color custom property off a live (connected) element, with a fallback. */
function themeColor(el: Element, propertyName: string, fallback: string): string {
  const value = getComputedStyle(el).getPropertyValue(propertyName).trim()
  return value || fallback
}

/**
 * Composites the WebGL background canvas + DOM subject slices + a settings
 * caption bar into a single downloadable PNG. Geometry and per-slice blur
 * come from `computeExportLayout`, which mirrors `ModelLayer`'s on-screen
 * math exactly (scaled 2x) so the export matches what's rendered on screen.
 * Requires the source canvas to have been created with
 * `preserveDrawingBuffer: true` (see `webgl/glContext.ts`) — otherwise its
 * contents are cleared before `drawImage` can read them.
 */
export function useImageExport(deps: UseImageExportDeps): UseImageExportApi {
  const { canvasRef, subject, derived, optics, viewportPx, captionText } = deps
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  const exportPng = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const sourceCanvas = canvasRef.current
      if (!sourceCanvas) throw new Error('dof-simulator export: viewport canvas not ready')

      const layout = computeExportLayout(viewportPx, subject, derived, optics, EXPORT_SCALE)
      const viewportHPx = layout.canvasH - layout.captionH

      const out = document.createElement('canvas')
      out.width = layout.canvasW
      out.height = layout.canvasH
      const ctx = out.getContext('2d')
      if (!ctx) throw new Error('dof-simulator export: 2D context unavailable')

      // Background: the WebGL shaped-bokeh canvas, scaled up to export size.
      ctx.drawImage(sourceCanvas, 0, 0, layout.canvasW, viewportHPx)

      // Subject slices, near -> far, each individually blurred to match ModelLayer.
      for (const slice of layout.slices) {
        const img = await loadImage(slice.src)
        const drawW = slice.h * (img.naturalWidth / img.naturalHeight)
        const dx = slice.x + (slice.w - drawW) / 2
        ctx.filter = slice.blurPx > 0 ? `blur(${slice.blurPx}px)` : 'none'
        ctx.drawImage(img, dx, slice.y, drawW, slice.h)
      }
      ctx.filter = 'none'

      // Caption bar.
      const surface = themeColor(sourceCanvas, '--bg-surface', CAPTION_FALLBACK_SURFACE)
      const textColor = themeColor(sourceCanvas, '--text-primary', CAPTION_FALLBACK_TEXT)
      ctx.fillStyle = surface
      ctx.fillRect(0, viewportHPx, layout.canvasW, layout.captionH)
      ctx.fillStyle = textColor
      ctx.font = `${CAPTION_FONT_PX * EXPORT_SCALE}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(captionText, CAPTION_PAD_X * EXPORT_SCALE, viewportHPx + layout.captionH / 2)

      const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('dof-simulator export: PNG encoding failed')

      downloadBlob(blob, 'dof-simulation.png')
    } catch (err) {
      Sentry.captureException(err, { tags: { module: 'dof-simulator', op: 'exportPng' } })
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [canvasRef, subject, derived, optics, viewportPx, captionText])

  return { exportPng, busy }
}

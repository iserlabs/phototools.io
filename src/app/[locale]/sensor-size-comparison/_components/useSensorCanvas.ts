'use client'

import { useState, useRef, useEffect, useCallback, type RefObject } from 'react'
import type { DisplayMode, ResolvedSensor } from './sensorSizeTypes'
import { ANIM_DURATION, DEFAULT_VISIBLE_IDS } from './sensorSizeTypes'
import { easeOut, orderForRender } from './sensorSizeHelpers'
import { drawOverlay, overlayRects } from './drawOverlay'
import { drawSideBySide } from './drawSideBySide'
import { drawPixelDensity } from './drawPixelDensity'
import { getCanvasPalette, invalidateCanvasPalette } from './canvasPalette'

// The CSS breakpoint where `.desktopOnly`/`.mobileControls` swap visibility
// (SensorSize.module.css: `@media (max-width: 1023px)`). The click-to-scroll
// gate below must agree with it — `SensorTable`'s desktop copy is the only
// one with an unhidden `sensor-row-desktop-*` id, so scrolling only makes
// sense (and only finds a visible element) above this same width.
const DESKTOP_BREAKPOINT = '(min-width: 1024px)'

type UseSensorCanvasArgs = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  mode: DisplayMode
  resolution: number
  allSensors: ResolvedSensor[]
  visible: Set<string>
}

/**
 * Owns the canvas draw loop (enter/exit animation, per-mode drawing, resize
 * + theme-change redraw) and canvas pointer interactions (hover, click to
 * expand a table row) for `SensorSize.tsx`. Extracted out of the component
 * so the component itself stays under the repo's 200-line file limit.
 */
export function useSensorCanvas({ canvasRef, mode, resolution, allSensors, visible }: UseSensorCanvasArgs) {
  const [hoveredSensor, setHoveredSensor] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const animRef = useRef<Map<string, { progress: number; direction: 'in' | 'out'; startTime: number }>>(new Map())
  const rafRef = useRef<number>(0)
  const prevVisibleRef = useRef<Set<string>>(new Set(DEFAULT_VISIBLE_IDS))

  useEffect(() => {
    const prev = prevVisibleRef.current
    const now = performance.now()
    for (const id of visible) { if (!prev.has(id)) animRef.current.set(id, { progress: 0, direction: 'in', startTime: now }) }
    for (const id of prev) { if (!visible.has(id)) animRef.current.set(id, { progress: 1, direction: 'out', startTime: now }) }
    prevVisibleRef.current = new Set(visible)
  }, [visible])

  const getRenderSensors = useCallback((): { sensors: ResolvedSensor[]; alphaMap: Map<string, number> } => {
    const alphaMap = new Map<string, number>()
    const ids = new Set(visible)
    for (const [id, anim] of animRef.current) {
      if (anim.direction === 'out' && anim.progress > 0) ids.add(id)
    }
    const sensors = orderForRender(allSensors.filter((s) => ids.has(s.id)))
    for (const s of sensors) {
      const anim = animRef.current.get(s.id)
      alphaMap.set(s.id, anim ? anim.progress : 1)
    }
    return { sensors, alphaMap }
  }, [visible, allSensors])

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const cssWidth = canvas.clientWidth
    if (cssWidth === 0) return
    const maxHeight = 5000
    canvas.style.height = `${maxHeight}px`
    canvas.width = cssWidth * dpr
    canvas.height = maxHeight * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, cssWidth, maxHeight)

    const now = performance.now()
    let animating = false
    for (const [id, anim] of animRef.current) {
      const elapsed = now - anim.startTime
      const t = Math.min(elapsed / ANIM_DURATION, 1)
      anim.progress = anim.direction === 'in' ? easeOut(t) : 1 - easeOut(t)
      if (t < 1) animating = true
      else if (anim.direction === 'in') animRef.current.delete(id)
    }
    for (const [id, anim] of animRef.current) {
      if (anim.direction === 'out' && anim.progress <= 0) animRef.current.delete(id)
    }

    const { sensors, alphaMap } = getRenderSensors()
    if (sensors.length === 0) return
    const padding = 30
    let contentH: number
    if (mode === 'overlay') {
      const palette = getCanvasPalette(canvas)
      contentH = drawOverlay(ctx, cssWidth, maxHeight, padding, sensors, alphaMap, hoveredSensor, palette)
    } else if (mode === 'side-by-side') {
      contentH = drawSideBySide(ctx, cssWidth, maxHeight, padding, sensors, alphaMap)
    } else {
      contentH = drawPixelDensity(ctx, cssWidth, maxHeight, padding, sensors, resolution, alphaMap)
    }

    const finalH = Math.max(contentH, 200)
    canvas.style.height = `${finalH}px`
    if (finalH < maxHeight) {
      const imageData = ctx.getImageData(0, 0, canvas.width, Math.ceil(finalH * dpr))
      canvas.height = Math.ceil(finalH * dpr)
      ctx.putImageData(imageData, 0, 0)
    }
    if (animating) rafRef.current = requestAnimationFrame(drawFrame)
  }, [canvasRef, mode, resolution, getRenderSensors, hoveredSensor])

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(drawFrame)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [drawFrame])

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(drawFrame)
  }, [visible, drawFrame])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(drawFrame)
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [canvasRef, drawFrame])

  // ThemeProvider toggles `data-theme` on <html> after read-through from
  // localStorage; invalidate the cached CSS-token palette and redraw so the
  // canvas tooltip stays legible across a theme switch.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      invalidateCanvasPalette()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(drawFrame)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [drawFrame])

  const hitTestOverlay = useCallback((clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left, my = clientY - rect.top
    for (let i = overlayRects.length - 1; i >= 0; i--) {
      const r = overlayRects[i]
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return r.id
    }
    return null
  }, [canvasRef])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'overlay') { setHoveredSensor(null); return }
    setHoveredSensor(hitTestOverlay(e.clientX, e.clientY))
  }, [mode, hitTestOverlay])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'overlay') return
    const id = hitTestOverlay(e.clientX, e.clientY)
    if (!id) return
    setExpandedId(id)
    if (window.matchMedia(DESKTOP_BREAKPOINT).matches) {
      document.getElementById(`sensor-row-desktop-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [mode, hitTestOverlay])

  return { hoveredSensor, setHoveredSensor, expandedId, setExpandedId, handleMouseMove, handleCanvasClick }
}

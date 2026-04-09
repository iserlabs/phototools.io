'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import type { DisplayMode } from '../sensorSizeTypes'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { ToolActions } from '@/components/shared/ToolActions'
import type { SensorPreset } from '@/lib/types'
import ss from '../SensorSize.module.css'
import { ANIM_DURATION, DEFAULT_VISIBLE_IDS } from '../sensorSizeTypes'
import { easeOut } from '../sensorSizeHelpers'
import { SensorControlsPanel } from '../SensorControlsPanel'
import { SensorTable } from '../SensorTable'
import { drawOverlay, overlayRects } from '../drawOverlay'
import { drawSideBySide } from '../drawSideBySide'
import { drawPixelDensity } from '../drawPixelDensity'
import { useSensorState } from '../useSensorState'
import { supportsHtmlInCanvas } from '@/lib/utils/html-in-canvas'
import { V2NotSupported } from '@/components/shared/V2NotSupported'
import { SensorSpecCard } from './SensorSpecCard'

export function SensorSizeV2() {
  const t = useTranslations('toolUI.sensor-size-comparison')
  const { trackParam } = useToolSession()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const specCardRef = useRef<HTMLDivElement>(null)
  const debugLoggedRef = useRef(false)
  const [hoveredSensor, setHoveredSensor] = useState<string | null>(null)

  const [isSupported, setIsSupported] = useState<boolean | null>(null)
  useEffect(() => { setIsSupported(supportsHtmlInCanvas()) }, [])

  const {
    visible, setVisible, mode, setMode, resolution, setResolution,
    customSensors, allSensors, visibleSensors,
    toggleSensor, addCustomSensor, editCustomSensor, removeAllCustomSensors, removeCustomSensor,
  } = useSensorState()

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

  const getRenderSensors = useCallback((): { sensors: Required<SensorPreset>[]; alphaMap: Map<string, number> } => {
    const alphaMap = new Map<string, number>()
    const ids = new Set(visible)
    for (const [id, anim] of animRef.current) {
      if (anim.direction === 'out' && anim.progress > 0) ids.add(id)
    }
    const sensors = allSensors.filter((s) => ids.has(s.id))
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
    if (mode === 'overlay') contentH = drawOverlay(ctx, cssWidth, maxHeight, padding, sensors, alphaMap, hoveredSensor)
    else if (mode === 'side-by-side') contentH = drawSideBySide(ctx, cssWidth, maxHeight, padding, sensors, alphaMap)
    else contentH = drawPixelDensity(ctx, cssWidth, maxHeight, padding, sensors, resolution, alphaMap)

    // Crop canvas to content height first (setting canvas.height clears it,
    // so we snapshot, resize, restore, THEN draw the v2 spec card on top)
    const finalH = Math.max(contentH, 200)
    canvas.style.height = `${finalH}px`
    if (finalH < maxHeight) {
      const imageData = ctx.getImageData(0, 0, canvas.width, Math.ceil(finalH * dpr))
      canvas.height = Math.ceil(finalH * dpr)
      ctx.putImageData(imageData, 0, 0)
    }

    // v2: Draw spec card via drawElementImage AFTER canvas is finalized
    if (hoveredSensor && specCardRef.current && mode === 'overlay') {
      const hRect = overlayRects.find(r => r.id === hoveredSensor)
      if (hRect) {
        const cardEl = specCardRef.current
        const naturalW = cardEl.offsetWidth
        const naturalH = cardEl.offsetHeight
        // Scale card to ~180px wide (fits beside sensor rects)
        const targetW = 180
        const cardScale = targetW / naturalW
        const drawW = targetW
        const drawH = Math.round(naturalH * cardScale)
        let cardX = hRect.x + hRect.w + 12
        if (cardX + drawW > cssWidth - padding) cardX = hRect.x - drawW - 12
        const cardY = Math.max(padding, hRect.y)
        try {
          /* eslint-disable @typescript-eslint/no-explicit-any */
          const ctxAny = ctx as any
          ctx.save()
          ctx.scale(dpr, dpr)
          ctxAny.drawElementImage(cardEl, cardX, cardY, drawW, drawH)
          ctx.restore()
          /* eslint-enable @typescript-eslint/no-explicit-any */
        } catch (err) {
          if (!debugLoggedRef.current) {
            debugLoggedRef.current = true
            console.warn('[v2] drawElementImage error:', err)
          }
        }
      }
    }
    if (animating) rafRef.current = requestAnimationFrame(drawFrame)
  }, [mode, resolution, getRenderSensors, hoveredSensor])

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
  }, [drawFrame])

  // v2: Listen for paint events and trigger initial snapshot
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onPaint = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(drawFrame)
    }
    canvas.addEventListener('paint', onPaint)
    // Request initial paint snapshot so drawElementImage works
    try { (canvas as HTMLCanvasElement & { requestPaint?: () => void }).requestPaint?.() } catch { /* not supported */ }
    return () => canvas.removeEventListener('paint', onPaint)
  }, [drawFrame])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'overlay') { setHoveredSensor(null); return }
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    for (let i = overlayRects.length - 1; i >= 0; i--) {
      const r = overlayRects[i]
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) { setHoveredSensor(r.id); return }
    }
    setHoveredSensor(null)
  }, [mode])

  if (isSupported === null) return null
  if (!isSupported) return <V2NotSupported v1Href="../sensor-size-comparison" />

  const controlsProps = {
    visible, mode, customSensors,
    onToggleSensor: (id: string) => { trackParam({ param_name: 'sensor', param_value: id, input_type: 'toggle' }); toggleSensor(id) },
    onModeChange: (m: DisplayMode) => { trackParam({ param_name: 'mode', param_value: m, input_type: 'select' }); setMode(m) },
    onAddCustom: addCustomSensor, onRemoveCustom: removeCustomSensor,
    onRemoveAllCustom: removeAllCustomSensors, onEditCustom: editCustomSensor,
  }

  return (
    <div className={ss.app}>
      <div className={ss.appBody}>
        <div className={ss.sidebar}>
          <ToolActions toolSlug="sensor-size-comparison" canvasRef={canvasRef} imageFilename="sensor-comparison.png" onReset={() => {
            setVisible(new Set(DEFAULT_VISIBLE_IDS)); setMode('overlay'); setResolution(24)
          }} />
          <SensorControlsPanel {...controlsProps} />
        </div>
        <div className={ss.main}>
          <canvas
            ref={canvasRef} className={ss.canvas}
            style={{ width: '100%', minHeight: 300, flexShrink: 0 }}
            aria-label={t('canvasAriaLabel', { mode })} role="img"
            onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredSensor(null)}
            {...({ layoutsubtree: '' } as React.HTMLAttributes<HTMLCanvasElement>)}
          >
            <SensorSpecCard
              ref={specCardRef}
              sensor={allSensors.find(s => s.id === hoveredSensor) ?? null}
              visible={hoveredSensor !== null && mode === 'overlay'}
            />
          </canvas>
          <div className={`${ss.tableWrap} ${ss.desktopOnly}`}><SensorTable sensors={visibleSensors} /></div>
        </div>
        <div className={ss.desktopOnly}><LearnPanel slug="sensor-size-comparison" /></div>
      </div>
      <div className={ss.mobileControls}>
        <SensorControlsPanel {...controlsProps} />
        <div className={ss.tableWrap}><SensorTable sensors={visibleSensors} /></div>
      </div>
      <div className={ss.mobileOnly}><LearnPanel slug="sensor-size-comparison" /></div>
    </div>
  )
}

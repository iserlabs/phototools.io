'use client'

import { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react'
import { drawWheelPixels, drawAnalyzerOverlay, type WheelDot, type WheelTarget, type WheelArrow } from './drawWheel'
import { useWheelPointer } from './useWheelPointer'
import { hslToRgb } from '@/lib/math/color'
import { rgbToHex } from '@/lib/math/color-fit'
import ch from './ColorAnalyzer.module.css'

export type WheelView = 'natural' | 'pure' | 'guide'

export interface ColorWheelProps {
  lightness: number
  dots: WheelDot[]
  targets: WheelTarget[]
  arrows: WheelArrow[]
  keyDot: { hue: number; s: number } | null
  selectedId: string | null
  customDraggable: boolean
  onKeyChange: (hue: number, s: number) => void
  onSelectDot: (id: string) => void
  onCustomTargetDrag: (id: string, hue: number) => void
}

export interface ColorWheelHandle { getCanvas(): HTMLCanvasElement | null }

const DESKTOP_SIZE = 440
const COMPACT_SIZE = 280
function getCanvasSize(): number {
  if (typeof window === 'undefined') return DESKTOP_SIZE
  return window.innerWidth < 1400 ? COMPACT_SIZE : DESKTOP_SIZE
}

export const ColorWheel = forwardRef<ColorWheelHandle, ColorWheelProps>(function ColorWheel(props, ref) {
  const { lightness, dots, targets, arrows, keyDot, selectedId, customDraggable, onKeyChange, onSelectDot, onCustomTargetDrag } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useImperativeHandle(ref, () => ({ getCanvas: () => canvasRef.current }))
  const [size, setSize] = useState(DESKTOP_SIZE)

  useEffect(() => {
    const onResize = () => setSize(getCanvasSize())
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const canvasPixels = size * dpr
  const cacheRef = useRef<{ imageData: ImageData; lightness: number; size: number } | null>(null)

  const { onPointerDown, onPointerMove, onPointerUp } = useWheelPointer(canvasRef, {
    keyMode: keyDot !== null,
    dots: dots.filter((d) => !d.neutral).map((d) => ({ id: d.id, hue: d.hue, r: d.r })),
    targets: targets.map((t) => ({ id: t.id, hue: t.hue, r: t.r })),
    customDraggable, onKeyChange, onSelectDot, onCustomTargetDrag,
  })

  const keyWheelDot: WheelDot | null = keyDot
    ? (() => { const rgb = hslToRgb(keyDot.hue, keyDot.s, lightness); return { id: 'key', hue: keyDot.hue, r: keyDot.s, hex: rgbToHex(rgb.r, rgb.g, rgb.b), index: 1, isKey: true, neutral: false } })()
    : null

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    canvas.width = canvasPixels; canvas.height = canvasPixels
    const imageData = drawWheelPixels(ctx, canvasPixels, lightness, cacheRef.current)
    cacheRef.current = { imageData, lightness, size: canvasPixels }
    drawAnalyzerOverlay(ctx, canvasPixels, dpr, { dots, targets, arrows, keyDot: keyWheelDot, selectedId, lightness })
  }, [canvasPixels, lightness, dots, targets, arrows, keyWheelDot, selectedId, dpr])

  useEffect(() => { draw() }, [draw])

  return (
    <div className={ch.wheelContainer}>
      <canvas ref={canvasRef} className={ch.wheelCanvas} style={{ width: size, height: size, cursor: 'pointer', touchAction: 'none' }}
        role="img" aria-label="Color wheel"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
    </div>
  )
})

export function WheelViewToggle({ view, onChange, labels }: { view: WheelView; onChange: (v: WheelView) => void; labels: Record<WheelView, string> }) {
  const views: WheelView[] = ['natural', 'pure', 'guide']
  return (
    <div className={ch.viewToggle} role="tablist" aria-label="Wheel view">
      {views.map((v) => (
        <button key={v} type="button" role="tab" aria-selected={view === v}
          className={`${ch.viewBtn} ${view === v ? ch.viewBtnActive : ''}`} onClick={() => onChange(v)}>
          {labels[v]}
        </button>
      ))}
    </div>
  )
}

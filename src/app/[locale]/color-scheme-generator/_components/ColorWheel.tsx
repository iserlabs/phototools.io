'use client'

import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'
import { useMediaQuery } from '@/lib/utils/useMediaQuery'
import { drawWheelPixels, drawOverlay } from './drawWheel'
import { useWheelPointer } from './useWheelPointer'
import ch from './ColorHarmony.module.css'

interface MonoPoint {
  h: number
  s: number
  l: number
}

interface ColorWheelProps {
  hue: number
  saturation: number
  lightness: number
  harmonyHues: number[]
  baseIndex: number
  draggableNodes: number[]
  monochromaticPoints?: MonoPoint[]
  onHueChange: (hue: number) => void
  onSaturationChange: (saturation: number) => void
  onSecondaryDrag: (nodeIndex: number, hue: number) => void
  onMonoDrag?: (nodeIndex: number, saturation: number) => void
}

const DESKTOP_SIZE = 440
const MOBILE_SIZE = 280
const MOBILE_QUERY = '(max-width: 1023px)'

export interface ColorWheelHandle {
  getCanvas(): HTMLCanvasElement | null
}

export const ColorWheel = forwardRef<ColorWheelHandle, ColorWheelProps>(function ColorWheel({
  saturation,
  lightness,
  harmonyHues,
  baseIndex,
  draggableNodes,
  monochromaticPoints,
  onHueChange,
  onSaturationChange,
  onSecondaryDrag,
  onMonoDrag,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }))
  const size = useMediaQuery(MOBILE_QUERY) ? MOBILE_SIZE : DESKTOP_SIZE

  const { dragModeRef, onPointerDown, onPointerMove, onPointerUp } = useWheelPointer(
    canvasRef, harmonyHues, saturation, draggableNodes, monochromaticPoints,
    onHueChange, onSaturationChange, onSecondaryDrag, onMonoDrag,
  )

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const canvasPixels = size * dpr

  const wheelCacheRef = useRef<{ imageData: ImageData; lightness: number; size: number } | null>(null)

  const drawWheel = useCallback((ctx: CanvasRenderingContext2D) => {
    const imageData = drawWheelPixels(ctx, canvasPixels, lightness, wheelCacheRef.current)
    wheelCacheRef.current = { imageData, lightness, size: canvasPixels }
  }, [canvasPixels, lightness])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = canvasPixels
    canvas.height = canvasPixels
    drawWheel(ctx)
    drawOverlay(ctx, canvasPixels, harmonyHues, saturation, lightness, dpr, baseIndex, monochromaticPoints)
  }, [canvasPixels, drawWheel, harmonyHues, saturation, lightness, dpr, baseIndex, monochromaticPoints])

  const isDragging = dragModeRef.current !== null

  return (
    <div className={ch.wheelContainer}>
      <canvas
        ref={canvasRef}
        className={ch.wheelCanvas}
        style={{
          width: size,
          height: size,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </div>
  )
})

'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import type { AnnotationShape, AnnotationTool } from './types'
import styles from './AnnotationCanvas.module.css'

interface AnnotationCanvasProps {
  width: number
  height: number
  shapes: AnnotationShape[]
  activeTool: AnnotationTool | null
  color: string
  strokeWidth: number
  onAdd: (shape: AnnotationShape) => void
}

export function AnnotationCanvas({ width, height, shapes, activeTool, color, strokeWidth, onAdd }: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)

  const toPercent = useCallback((px: number, dim: number) => (px / dim) * 100, [])

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, s: AnnotationShape, w: number, h: number) => {
    const x1 = (s.x1 / 100) * w, y1 = (s.y1 / 100) * h
    const x2 = (s.x2 / 100) * w, y2 = (s.y2 / 100) * h
    ctx.save()
    ctx.globalAlpha = s.opacity
    ctx.strokeStyle = s.color
    ctx.fillStyle = s.color
    ctx.lineWidth = s.strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    switch (s.tool) {
      case 'arrow': {
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
        // Arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1)
        const headLen = Math.max(12, s.strokeWidth * 4)
        ctx.beginPath()
        ctx.moveTo(x2, y2)
        ctx.lineTo(x2 - headLen * Math.cos(angle - 0.4), y2 - headLen * Math.sin(angle - 0.4))
        ctx.lineTo(x2 - headLen * Math.cos(angle + 0.4), y2 - headLen * Math.sin(angle + 0.4))
        ctx.closePath()
        ctx.fill()
        break
      }
      case 'circle': {
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2
        const rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2
        ctx.beginPath()
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        ctx.stroke()
        break
      }
      case 'rect': {
        ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1))
        break
      }
      case 'highlight': {
        ctx.globalAlpha = 0.25
        ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1))
        break
      }
      case 'callout': {
        // Callout: circle marker at x1,y1 + line to x2,y2
        ctx.beginPath()
        ctx.arc(x1, y1, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
        break
      }
    }
    ctx.restore()
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    for (const s of shapes) drawShape(ctx, s, width, height)

    // Draw in-progress shape
    if (drawing && activeTool) {
      drawShape(ctx, {
        id: 'preview',
        tool: activeTool,
        x1: toPercent(drawing.x1, width), y1: toPercent(drawing.y1, height),
        x2: toPercent(drawing.x2, width), y2: toPercent(drawing.y2, height),
        color, strokeWidth, opacity: 0.6,
      }, width, height)
    }
  }, [shapes, drawing, activeTool, color, strokeWidth, width, height, drawShape, toPercent])

  useEffect(() => { redraw() }, [redraw])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!activeTool) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left, y = e.clientY - rect.top
    setDrawing({ x1: x, y1: y, x2: x, y2: y })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [activeTool])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!drawing) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    setDrawing(prev => prev ? { ...prev, x2: e.clientX - rect.left, y2: e.clientY - rect.top } : null)
  }, [drawing])

  const handlePointerUp = useCallback(() => {
    if (!drawing || !activeTool) { setDrawing(null); return }
    const dx = Math.abs(drawing.x2 - drawing.x1), dy = Math.abs(drawing.y2 - drawing.y1)
    if (dx < 5 && dy < 5) { setDrawing(null); return } // Too small, ignore
    onAdd({
      id: `ann_${Date.now()}`,
      tool: activeTool,
      x1: toPercent(drawing.x1, width), y1: toPercent(drawing.y1, height),
      x2: toPercent(drawing.x2, width), y2: toPercent(drawing.y2, height),
      color, strokeWidth, opacity: activeTool === 'highlight' ? 0.25 : 0.9,
    })
    setDrawing(null)
  }, [drawing, activeTool, color, strokeWidth, width, height, onAdd, toPercent])

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      style={{ width, height, cursor: activeTool ? 'crosshair' : 'default' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  )
}

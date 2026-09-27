'use client'

import { useRef, useCallback } from 'react'
import { hitTest, pointerToPolar, type WheelPoint } from './wheelHit'

const HIT_RADIUS = 16

type DragMode = null | { kind: 'key' } | { kind: 'target'; id: string }

export function useWheelPointer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  o: {
    keyMode: boolean                     // no samples: whole wheel drags the key
    dots: WheelPoint[]
    targets: WheelPoint[]
    customDraggable: boolean
    onKeyChange: (hue: number, s: number) => void
    onSelectDot: (id: string) => void
    onCustomTargetDrag: (id: string, hue: number) => void
  },
) {
  const rafRef = useRef(0)
  const dragRef = useRef<DragMode>(null)

  const geom = useCallback((e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const px = e.clientX - rect.left, py = e.clientY - rect.top
    const cx = rect.width / 2, cy = rect.height / 2
    return { px, py, cx, cy, R: rect.width / 2 }
  }, [canvasRef])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { px, py, cx, cy, R } = geom(e)
    const polar = pointerToPolar(px, py, cx, cy, R)
    if (!polar.inside) return
    canvas.setPointerCapture(e.pointerId)

    if (o.keyMode) {
      dragRef.current = { kind: 'key' }
      o.onKeyChange(polar.hue, polar.r)
      return
    }
    const dot = hitTest(o.dots, px, py, cx, cy, R, HIT_RADIUS)
    if (dot) { o.onSelectDot(dot); return }
    if (o.customDraggable) {
      const target = hitTest(o.targets, px, py, cx, cy, R, HIT_RADIUS)
      if (target) dragRef.current = { kind: 'target', id: target }
    }
  }, [canvasRef, geom, o])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const mode = dragRef.current
    if (!mode) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const { clientX, clientY } = e
    rafRef.current = requestAnimationFrame(() => {
      if (!canvasRef.current) return
      const { px, py, cx, cy, R } = geom({ clientX, clientY })
      const polar = pointerToPolar(px, py, cx, cy, R)
      if (mode.kind === 'key') o.onKeyChange(polar.hue, polar.r)
      else o.onCustomTargetDrag(mode.id, polar.hue)
    })
  }, [canvasRef, geom, o])

  const onPointerUp = useCallback(() => {
    dragRef.current = null
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0 }
  }, [])

  return { onPointerDown, onPointerMove, onPointerUp }
}

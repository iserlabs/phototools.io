'use client'

import { useRef, useCallback } from 'react'
import { hueToPos } from './drawWheel'

interface MonoPoint {
  h: number
  s: number
  l: number
}

const NODE_HIT_RADIUS = 16

export function useWheelPointer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  harmonyHues: number[],
  saturation: number,
  draggableNodes: number[],
  monochromaticPoints: MonoPoint[] | undefined,
  onHueChange: (hue: number) => void,
  onSaturationChange: (saturation: number) => void,
  onSecondaryDrag: (nodeIndex: number, hue: number) => void,
  onMonoDrag?: (nodeIndex: number, saturation: number) => void,
) {
  const rafRef = useRef<number>(0)
  const dragModeRef = useRef<null | 'wheel' | number>(null)

  const getAngleFromPointer = useCallback((clientX: number, clientY: number): { angle: number; dist: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { angle: 0, dist: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left - rect.width / 2
    const y = clientY - rect.top - rect.height / 2
    const dist = Math.sqrt(x * x + y * y)
    let angle = Math.atan2(x, -y) * (180 / Math.PI)
    if (angle < 0) angle += 360
    return { angle, dist }
  }, [canvasRef])

  const hitTestNode = useCallback((clientX: number, clientY: number): number | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const cssRadius = rect.width / 2

    for (const nodeIdx of draggableNodes) {
      let pos: { x: number; y: number }
      if (monochromaticPoints && monochromaticPoints[nodeIdx]) {
        const mp = monochromaticPoints[nodeIdx]
        pos = hueToPos(mp.h, mp.s, rect.width / 2, rect.height / 2, cssRadius)
      } else {
        const h = harmonyHues[nodeIdx]
        if (h === undefined) continue
        pos = hueToPos(h, saturation, rect.width / 2, rect.height / 2, cssRadius)
      }
      const dx = (clientX - rect.left) - pos.x
      const dy = (clientY - rect.top) - pos.y
      if (Math.sqrt(dx * dx + dy * dy) < NODE_HIT_RADIUS) {
        return nodeIdx
      }
    }
    return null
  }, [canvasRef, draggableNodes, harmonyHues, saturation, monochromaticPoints])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    const dist = Math.sqrt(x * x + y * y)
    if (dist > rect.width / 2) return

    canvas.setPointerCapture(e.pointerId)

    const hitNode = hitTestNode(e.clientX, e.clientY)
    if (hitNode !== null) {
      dragModeRef.current = hitNode
      return
    }

    dragModeRef.current = 'wheel'
    const { angle } = getAngleFromPointer(e.clientX, e.clientY)
    onHueChange(Math.round(angle) % 360)
    const maxDist = rect.width / 2
    onSaturationChange(Math.round(Math.min(dist / maxDist, 1) * 100))
  }, [canvasRef, hitTestNode, getAngleFromPointer, onHueChange, onSaturationChange])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragModeRef.current === null) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    rafRef.current = requestAnimationFrame(() => {
      const { angle, dist } = getAngleFromPointer(e.clientX, e.clientY)
      const canvas = canvasRef.current
      if (!canvas) return

      if (dragModeRef.current === 'wheel') {
        onHueChange(Math.round(angle) % 360)
        const maxDist = canvas.getBoundingClientRect().width / 2
        onSaturationChange(Math.round(Math.min(dist / maxDist, 1) * 100))
      } else if (typeof dragModeRef.current === 'number') {
        if (monochromaticPoints && onMonoDrag) {
          const maxDist = canvas.getBoundingClientRect().width / 2
          const newSat = Math.round(Math.min(dist / maxDist, 1) * 100)
          onMonoDrag(dragModeRef.current, newSat)
        } else {
          onSecondaryDrag(dragModeRef.current, Math.round(angle) % 360)
        }
      }
    })
  }, [canvasRef, getAngleFromPointer, onHueChange, onSaturationChange, onSecondaryDrag, monochromaticPoints, onMonoDrag])

  const onPointerUp = useCallback(() => {
    dragModeRef.current = null
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  return { dragModeRef, onPointerDown, onPointerMove, onPointerUp }
}

'use client'

import { useState, useRef, useCallback } from 'react'

interface MagnifierState {
  vpX: number
  vpY: number
  hex: string
  canvasX: number
  canvasY: number
}

export function getPixelColor(ctx: CanvasRenderingContext2D, x: number, y: number): string {
  const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')
}

export function useMagnifier(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const [magnifier, setMagnifier] = useState<MagnifierState | null>(null)
  const magCanvasRef = useRef<HTMLCanvasElement>(null)

  const drawMagnifier = useCallback(
    (canvasX: number, canvasY: number) => {
      const magCanvas = magCanvasRef.current
      const srcCanvas = canvasRef.current
      if (!magCanvas || !srcCanvas) return
      const zoom = 4
      const srcSize = 20
      const magSize = srcSize * zoom
      magCanvas.width = magSize
      magCanvas.height = magSize
      const ctx = magCanvas.getContext('2d')
      if (!ctx) return
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(
        srcCanvas,
        canvasX - srcSize / 2,
        canvasY - srcSize / 2,
        srcSize,
        srcSize,
        0,
        0,
        magSize,
        magSize,
      )
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(magSize / 2, 0)
      ctx.lineTo(magSize / 2, magSize)
      ctx.moveTo(0, magSize / 2)
      ctx.lineTo(magSize, magSize / 2)
      ctx.stroke()
    },
    [canvasRef],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const canvasX = Math.round((e.clientX - rect.left) * scaleX)
      const canvasY = Math.round((e.clientY - rect.top) * scaleY)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      const hex = getPixelColor(ctx, canvasX, canvasY)

      const offsetX = 50
      const offsetY = -90
      let vpX = e.clientX + offsetX
      let vpY = e.clientY + offsetY
      const magDiameter = 80
      if (vpX + magDiameter > window.innerWidth) vpX = e.clientX - offsetX - magDiameter
      if (vpY < 0) vpY = e.clientY + 20

      setMagnifier({ vpX, vpY, hex, canvasX, canvasY })
      drawMagnifier(canvasX, canvasY)
    },
    [canvasRef, drawMagnifier],
  )

  const handlePointerLeave = useCallback(() => {
    setMagnifier(null)
  }, [])

  return { magnifier, magCanvasRef, handlePointerMove, handlePointerLeave }
}

'use client'

import { useRef, useEffect, useImperativeHandle, type Ref } from 'react'
import { type Star, STAR_COUNT, ANIM_DURATION, generateStars } from './starDrawing'
import { drawSharpScene, drawTrailsScene } from './starScenes'
import { useIsRendered } from '@/lib/utils/useIsRendered'
import { useMediaQuery } from '@/lib/utils/useMediaQuery'
import css from './StarTrailCalculator.module.css'

export interface StarTrailCanvasHandle {
  canvas: HTMLCanvasElement | null
  drawStatic: () => void
}

interface StarTrailCanvasProps {
  ref?: Ref<StarTrailCanvasHandle>
  mode: 'sharp' | 'trails'
  maxExposure500: number
  maxExposureNPF: number
  totalExposure: number
  latitude: number
  exposurePerFrame: number
}

const STARS: Star[] = generateStars(STAR_COUNT)

export function StarTrailCanvas({
  ref,
  mode,
  maxExposure500,
  maxExposureNPF,
  totalExposure,
  latitude,
  exposurePerFrame,
}: StarTrailCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  // The trails loop runs forever: pause it while the canvas area is scrolled
  // off-screen (mobile), and show the finished trails instead of animating
  // for users who prefer reduced motion.
  const isRendered = useIsRendered(canvasRef, { parent: true })
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useImperativeHandle(ref, () => ({
    canvas: canvasRef.current,
    drawStatic: () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const dpr = window.devicePixelRatio || 1
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (mode === 'sharp') {
        drawSharpScene(ctx, w, h, STARS, latitude, maxExposure500, maxExposureNPF, exposurePerFrame)
      } else {
        drawTrailsScene(ctx, w, h, 1, STARS, latitude, totalExposure)
      }
    },
  }), [mode, latitude, maxExposure500, maxExposureNPF, exposurePerFrame, totalExposure])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const parent = canvas.parentElement
    if (!parent) return
    const rect = parent.getBoundingClientRect()
    const isMobile = rect.width < 768
    const size = isMobile
      ? rect.width
      : Math.min(rect.width - 48, rect.height - 48, 600)
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    if (mode === 'sharp') {
      drawSharpScene(ctx, size, size, STARS, latitude, maxExposure500, maxExposureNPF, exposurePerFrame)
      return
    }

    if (reduceMotion) {
      drawTrailsScene(ctx, size, size, 1, STARS, latitude, totalExposure)
      return
    }
    if (!isRendered) return

    startTimeRef.current = 0
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const cycleTime = ANIM_DURATION + 1000
      const cycleElapsed = elapsed % cycleTime
      const progress = Math.min(cycleElapsed / ANIM_DURATION, 1)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawTrailsScene(ctx, size, size, progress, STARS, latitude, totalExposure)
      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [mode, latitude, maxExposure500, maxExposureNPF, exposurePerFrame, totalExposure, isRendered, reduceMotion])

  return (
    <canvas
      ref={canvasRef}
      className={css.starCanvas}
      role="img"
      aria-label={
        mode === 'sharp'
          ? `Star field showing sharp stars at latitude ${latitude} degrees`
          : `Animated star trails at latitude ${latitude} degrees`
      }
    />
  )
}

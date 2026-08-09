'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import * as Sentry from '@sentry/nextjs'
import type { BokehShapeId } from '@/lib/math/bokehKernel'
import { createGl, attachLossHandlers, sizeCanvas, type GlHandle } from './webgl/glContext'
import { buildProgram } from './webgl/glProgram'
import { loadTexture } from './webgl/glTexture'
import { PASSTHROUGH_VERT } from './shaders/passthrough.vert'
import { BOKEH_BLUR_FRAG } from './shaders/bokehBlur.frag'
import { drawFrame, getFrameUniforms, createTapsCache, type FrameUniforms } from './drawFrame'

export interface RenderSide {
  blurRadiusFrac: number
  bokeh: BokehShapeId
  uvRect: [number, number, number, number]
}

export interface RendererApi {
  status: 'loading' | 'ready' | 'fallback' | 'error'
}

function reportError(err: unknown, op: string) {
  Sentry.captureException(err, { tags: { module: 'dof-simulator', op } })
}

/**
 * Render-on-change WebGL2 hook for the DOF viewport's shaped-bokeh background
 * blur. No RAF loop: redraws only when a dependency actually changes, plus on
 * canvas resize and WebGL context restore. Falls back to CSS-blur status when
 * WebGL2 is unavailable or the program fails to build.
 */
export function useRenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  textureUrl: string,
  sideA: RenderSide,
  sideB: RenderSide | null,
  dividerPos: number,
): RendererApi {
  const [status, setStatus] = useState<RendererApi['status']>('loading')
  // Bumped after a post-restore rebuild so the texture-load effect below
  // re-runs even though `textureUrl` is unchanged (the GPU texture was
  // invalidated along with everything else on the lost context).
  const [restoreGeneration, setRestoreGeneration] = useState(0)
  const handleRef = useRef<GlHandle | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const uniformsRef = useRef<FrameUniforms | null>(null)
  const textureRef = useRef<WebGLTexture | null>(null)
  const getTapsRef = useRef(createTapsCache())
  const drawRef = useRef<() => void>(() => {})

  // Primitive fields only — RenderSide objects from the state facade are
  // referentially unstable (fresh object per parent render), so `draw` below
  // must never close over `sideA`/`sideB` themselves, only these scalars.
  const aBlur = sideA.blurRadiusFrac
  const aBokeh = sideA.bokeh
  const [aUv0, aUv1, aUv2, aUv3] = sideA.uvRect
  const hasSideB = sideB !== null
  const bBlur = sideB?.blurRadiusFrac ?? 0
  const bBokeh = sideB?.bokeh ?? aBokeh
  const [bUv0, bUv1, bUv2, bUv3] = sideB?.uvRect ?? [0, 0, 1, 1]

  const draw = useCallback(() => {
    const handle = handleRef.current
    const program = programRef.current
    const uniforms = uniformsRef.current
    const canvas = canvasRef.current
    const texture = textureRef.current
    if (!handle || handle.lost || !program || !uniforms || !canvas || !texture) return
    const w = canvas.width
    const h = canvas.height
    if (w === 0 || h === 0) return
    drawFrame(
      handle.gl, program, uniforms, texture, w, h,
      { blur: aBlur, bokeh: aBokeh, uv: [aUv0, aUv1, aUv2, aUv3] },
      hasSideB ? { blur: bBlur, bokeh: bBokeh, uv: [bUv0, bUv1, bUv2, bUv3] } : null,
      dividerPos, getTapsRef.current,
    )
  }, [canvasRef, dividerPos, aBlur, aBokeh, aUv0, aUv1, aUv2, aUv3, hasSideB, bBlur, bBokeh, bUv0, bUv1, bUv2, bUv3])
  drawRef.current = draw

  const loadTex = useCallback(() => {
    const handle = handleRef.current
    if (!handle || handle.lost) return () => {}
    let cancelled = false
    let retried = false
    const attempt = () => {
      loadTexture(handle.gl, textureUrl)
        .then((tex) => {
          if (cancelled || handle.lost) return
          const prev = textureRef.current
          textureRef.current = tex
          if (prev) handle.gl.deleteTexture(prev)
          setStatus((s) => (s === 'error' ? s : 'ready'))
          drawRef.current()
        })
        .catch((err: unknown) => {
          if (cancelled) return
          if (!retried) { retried = true; attempt(); return }
          reportError(err, 'loadTexture')
          setStatus('error')
        })
    }
    attempt()
    return () => { cancelled = true }
  }, [textureUrl])

  // Mount-only: create the GL context, build the program, wire context-loss
  // recovery, size the canvas. Does NOT load the texture — that's owned
  // solely by the loadTex effect below (one cancellable chain per mount).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handle = createGl(canvas)
    if (!handle) { setStatus('fallback'); return }
    handleRef.current = handle

    // Builds GL resources (program + uniforms) only. Returns whether it
    // succeeded so callers can decide whether a texture (re)load is warranted.
    const initResources = (): boolean => {
      if (handle.lost) return false
      try {
        const program = buildProgram(handle.gl, PASSTHROUGH_VERT, BOKEH_BLUR_FRAG)
        programRef.current = program
        uniformsRef.current = getFrameUniforms(handle.gl, program)
        return true
      } catch (err) {
        // Gated on !handle.lost above, so a throw here is a genuine compile/link
        // bug on a live context — actionable, worth reporting.
        reportError(err, 'buildProgram')
        setStatus('error')
        return false
      }
    }

    // preventDefault() (inside attachLossHandlers) is required for the browser
    // to fire 'webglcontextrestored'; drop the now-invalid resource refs.
    const handleLost = () => {
      programRef.current = null
      uniformsRef.current = null
      textureRef.current = null
      setStatus('loading')
    }
    const handleRestored = () => {
      // Context loss invalidates every GPU object, including the quad VBO that
      // createGl built on the (identical, per spec) restored context — rebuild
      // it via the same call, discarding the returned handle wrapper.
      if (!createGl(canvas)) return
      // Only reload when the rebuild succeeded (a failed rebuild never loaded
      // a texture either). Bumping state — not calling loadTex directly —
      // routes the reload through the single owning effect below.
      if (initResources()) setRestoreGeneration((g) => g + 1)
    }
    const detachLoss = attachLossHandlers(handle, handleLost, handleRestored)

    const parent = canvas.parentElement
    const observer = parent
      ? new ResizeObserver(() => {
          const rect = parent.getBoundingClientRect()
          if (rect.width === 0 || rect.height === 0) return
          sizeCanvas(canvas, rect.width, rect.height)
          drawRef.current()
        })
      : null
    observer?.observe(parent!)

    initResources()

    return () => {
      detachLoss()
      observer?.disconnect()
      if (!handle.gl.isContextLost()) {
        if (programRef.current) handle.gl.deleteProgram(programRef.current)
        if (textureRef.current) handle.gl.deleteTexture(textureRef.current)
      }
      handleRef.current = null
      programRef.current = null
      uniformsRef.current = null
      textureRef.current = null
    }
  }, [canvasRef])

  // The only place `loadTex` is invoked. Reruns on textureUrl change (new
  // `loadTex` identity) or a restore-triggered `restoreGeneration` bump; the
  // returned cleanup cancels the in-flight chain first either way.
  useEffect(() => {
    const cleanup = loadTex()
    return cleanup
  }, [loadTex, restoreGeneration])

  useEffect(() => { draw() }, [draw])

  return useMemo(() => ({ status }), [status])
}

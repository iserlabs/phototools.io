'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { passthroughVertexShader } from './shaders/passthrough.vert'
import { dofFragmentShader } from './shaders/dof.frag'
import { motionFragmentShader } from './shaders/motion.frag'
import { noiseFragmentShader } from './shaders/noise.frag'
import {
  type GLResources,
  createProgram, createFramebuffer, loadImageAsTexture, setupFullScreenQuad,
} from './webglHelpers'
import { runRenderPipeline, cleanupResources } from './renderPipeline'

interface SceneAssets {
  photo: string
  depthMap: string
  motionMask: string
}

export function useExposureRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  scene: SceneAssets | null,
  aperture: number,
  shutterSpeed: number,
  iso: number
): { isLoading: boolean; error: string | null } {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const resourcesRef = useRef<GLResources | null>(null)
  const sceneRef = useRef<string | null>(null)

  const initGL = useCallback((canvas: HTMLCanvasElement): GLResources | null => {
    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: false })
    if (!gl) {
      setError('WebGL2 is not supported by your browser.')
      return null
    }

    const dofProgram = createProgram(gl, passthroughVertexShader, dofFragmentShader)
    const motionProgram = createProgram(gl, passthroughVertexShader, motionFragmentShader)
    const noiseProgram = createProgram(gl, passthroughVertexShader, noiseFragmentShader)
    const vao = setupFullScreenQuad(gl, dofProgram)

    return {
      gl, dofProgram, motionProgram, noiseProgram, vao,
      framebufferA: null, framebufferB: null,
      textureA: null, textureB: null,
      photoTexture: null, depthTexture: null, motionTexture: null,
      width: 0, height: 0,
    }
  }, [])

  useEffect(() => {
    if (!canvasRef.current || !scene) return

    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)

      let resources = resourcesRef.current
      if (!resources) {
        resources = initGL(canvasRef.current!)
        if (!resources) return
        resourcesRef.current = resources
      }

      if (sceneRef.current === scene.photo) {
        setIsLoading(false)
        return
      }

      const { gl } = resources

      try {
        const [photoResult, depthResult, motionResult] = await Promise.all([
          loadImageAsTexture(gl, scene.photo),
          loadImageAsTexture(gl, scene.depthMap),
          loadImageAsTexture(gl, scene.motionMask),
        ])

        if (cancelled) return

        if (resources.photoTexture) gl.deleteTexture(resources.photoTexture)
        if (resources.depthTexture) gl.deleteTexture(resources.depthTexture)
        if (resources.motionTexture) gl.deleteTexture(resources.motionTexture)

        resources.photoTexture = photoResult.texture
        resources.depthTexture = depthResult.texture
        resources.motionTexture = motionResult.texture

        const canvas = canvasRef.current!
        canvas.width = photoResult.width
        canvas.height = photoResult.height
        resources.width = photoResult.width
        resources.height = photoResult.height

        if (resources.framebufferA) gl.deleteFramebuffer(resources.framebufferA)
        if (resources.framebufferB) gl.deleteFramebuffer(resources.framebufferB)
        if (resources.textureA) gl.deleteTexture(resources.textureA)
        if (resources.textureB) gl.deleteTexture(resources.textureB)

        const fbA = createFramebuffer(gl, photoResult.width, photoResult.height)
        const fbB = createFramebuffer(gl, photoResult.width, photoResult.height)
        resources.framebufferA = fbA.fb
        resources.textureA = fbA.tex
        resources.framebufferB = fbB.fb
        resources.textureB = fbB.tex

        sceneRef.current = scene.photo
        setIsLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load scene')
          setIsLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [canvasRef, scene, initGL])

  useEffect(() => {
    const resources = resourcesRef.current
    if (!resources || !resources.photoTexture || !resources.framebufferA || isLoading) return
    runRenderPipeline(resources, aperture, shutterSpeed, iso)
  }, [aperture, shutterSpeed, iso, isLoading])

  useEffect(() => {
    return () => {
      if (resourcesRef.current) {
        cleanupResources(resourcesRef.current)
        resourcesRef.current = null
      }
    }
  }, [])

  return { isLoading, error }
}

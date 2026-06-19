'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as Sentry from '@sentry/nextjs'
import { calcFOV } from '@/lib/math/fov'
import { getSensor } from '@/lib/data/sensors'
import { compressionVertexShader } from './shaders/compression.vert'
import { compressionFragmentShader } from './shaders/compression.frag'
import {
  PILLAR_COUNT, PILLAR_SPACING, PILLAR_RADIUS, PILLAR_HEIGHT,
  PILLAR_SEGMENTS, PILLAR_X, PILLAR_COLORS,
} from './compressionConstants'
import type { CompressionSceneProps } from './compressionConstants'
import { mat4Perspective, mat4LookAt } from './compressionMath'
import { buildCylinder, buildGroundPlaneWithGrid, mergeGeo, createProgram } from './compressionGeometry'
import { CompressionDiagram } from './CompressionDiagram'
import styles from './CompressionScene.module.css'

export type { CompressionSceneProps }

export function CompressionScene({ focalLength, sensorId, distance }: CompressionSceneProps) {
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGL2RenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const vaoRef = useRef<WebGLVertexArrayObject | null>(null)
  const vertCountRef = useRef(0)
  // Always-current render fn, so the mount-only effect (and the context-restore
  // handler) can repaint with the latest props without re-running setup.
  const render3DRef = useRef<() => void>(() => {})

  useEffect(() => {
    const canvas = sceneCanvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl2', { antialias: true })
    if (!gl) return
    glRef.current = gl

    // Build all GPU resources. Re-runnable so the scene recovers after the
    // browser drops and restores the WebGL context (common on Safari) instead
    // of staying blank — see 'webglcontextrestored' below.
    const initResources = () => {
      if (gl.isContextLost()) return

      let program: WebGLProgram | null
      try {
        program = createProgram(gl, compressionVertexShader, compressionFragmentShader)
      } catch (e) {
        // createProgram returns null on context loss now, so a throw here is a
        // genuine GLSL compile/link bug — actionable, worth reporting.
        Sentry.captureException(e, { tags: { module: 'compression-scene', op: 'createProgram' } })
        return
      }
      if (!program) return // context lost mid-init; 'webglcontextrestored' will retry
      programRef.current = program

      const parts = [buildGroundPlaneWithGrid()]
      for (let i = 0; i < PILLAR_COUNT; i++) {
        const pz = -(i * PILLAR_SPACING)
        parts.push(buildCylinder(PILLAR_X, pz, PILLAR_RADIUS, PILLAR_HEIGHT, PILLAR_SEGMENTS, PILLAR_COLORS[i % PILLAR_COLORS.length]))
      }
      const geo = mergeGeo(...parts)
      vertCountRef.current = geo.positions.length / 3

      const vao = gl.createVertexArray()
      gl.bindVertexArray(vao)
      vaoRef.current = vao

      const posBuf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geo.positions), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)

      const normBuf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, normBuf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geo.normals), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0)

      const colBuf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, colBuf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geo.colors), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(2)
      gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0)

      gl.bindVertexArray(null)
      gl.enable(gl.DEPTH_TEST)
      gl.clearColor(0.08, 0.08, 0.15, 1.0)

      render3DRef.current()
    }

    // preventDefault() is required for the browser to fire the matching
    // 'webglcontextrestored'; drop the now-invalid resource handles on loss.
    const handleContextLost = (e: Event) => {
      e.preventDefault()
      programRef.current = null
      vaoRef.current = null
    }
    const handleContextRestored = () => initResources()

    canvas.addEventListener('webglcontextlost', handleContextLost)
    canvas.addEventListener('webglcontextrestored', handleContextRestored)
    initResources()

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
      if (!gl.isContextLost()) {
        if (programRef.current) gl.deleteProgram(programRef.current)
        if (vaoRef.current) gl.deleteVertexArray(vaoRef.current)
      }
      programRef.current = null
      vaoRef.current = null
      glRef.current = null
    }
  }, [])

  const render3D = useCallback(() => {
    const gl = glRef.current
    const program = programRef.current
    const vao = vaoRef.current
    const canvas = sceneCanvasRef.current
    if (!gl || !program || !vao || !canvas) return

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindVertexArray(vao)

    const sensor = getSensor(sensorId)
    const fov = calcFOV(focalLength, sensor.cropFactor)
    const vFovRad = (fov.vertical * Math.PI) / 180

    const aspect = canvas.width / canvas.height
    const cameraZ = distance
    const eye: [number, number, number] = [0, PILLAR_HEIGHT * 0.45, cameraZ]
    const target: [number, number, number] = [PILLAR_X * 0.5, PILLAR_HEIGHT * 0.45, 0]

    const projection = mat4Perspective(vFovRad, aspect, 0.5, 800.0)
    const view = mat4LookAt(eye, target, [0, 1, 0])

    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_projection'), false, projection)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'u_view'), false, view)
    gl.uniform3f(gl.getUniformLocation(program, 'u_lightDir'), 0.5, 1.0, 0.5)
    gl.uniform3f(gl.getUniformLocation(program, 'u_cameraPos'), eye[0], eye[1], eye[2])

    gl.drawArrays(gl.TRIANGLES, 0, vertCountRef.current)
    gl.bindVertexArray(null)
  }, [focalLength, sensorId, distance])
  render3DRef.current = render3D

  useEffect(() => {
    const canvas = sceneCanvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      render3D()
    })
    observer.observe(canvas.parentElement!)
    return () => observer.disconnect()
  }, [render3D])

  useEffect(() => { render3D() }, [render3D])

  return (
    <div className={styles.container}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <canvas
          ref={sceneCanvasRef}
          className={styles.sceneCanvas}
          aria-label="Perspective compression 3D scene"
          role="img"
        />
      </div>
      <CompressionDiagram focalLength={focalLength} sensorId={sensorId} distance={distance} />
    </div>
  )
}

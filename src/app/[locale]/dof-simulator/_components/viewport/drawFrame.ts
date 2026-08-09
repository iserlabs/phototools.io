import { generateKernel, type BokehShapeId } from '@/lib/math/bokehKernel'
import { packTaps } from './webgl/glTexture'

export interface FrameUniforms {
  uTex: WebGLUniformLocation | null
  uTaps: WebGLUniformLocation | null
  uRadiusFrac: WebGLUniformLocation | null
  uViewAspect: WebGLUniformLocation | null
  uUvRect: WebGLUniformLocation | null
  uBloom: WebGLUniformLocation | null
}

export interface SideParams {
  blur: number
  bokeh: BokehShapeId
  uv: [number, number, number, number]
}

/** Looks up every uniform location the shader declares, once per program build. */
export function getFrameUniforms(gl: WebGL2RenderingContext, program: WebGLProgram): FrameUniforms {
  return {
    uTex: gl.getUniformLocation(program, 'uTex'),
    uTaps: gl.getUniformLocation(program, 'uTaps'),
    uRadiusFrac: gl.getUniformLocation(program, 'uRadiusFrac'),
    uViewAspect: gl.getUniformLocation(program, 'uViewAspect'),
    uUvRect: gl.getUniformLocation(program, 'uUvRect'),
    uBloom: gl.getUniformLocation(program, 'uBloom'),
  }
}

/**
 * Memoizes `generateKernel` → `packTaps` per bokeh shape so taps regenerate
 * only when the shape actually changes, not on every draw.
 */
export function createTapsCache(): (shape: BokehShapeId) => Float32Array {
  const cache = new Map<BokehShapeId, Float32Array>()
  return (shape) => {
    let taps = cache.get(shape)
    if (!taps) {
      taps = packTaps(generateKernel(shape))
      cache.set(shape, taps)
    }
    return taps
  }
}

// Highlight-boost uniform (bokehBlur.frag's uBloom, range 0..3). Not exposed by
// RenderSide/ViewportProps — no control feeds it yet — so it's a fixed constant
// here rather than invented state ahead of the brief's interfaces.
const BLOOM_INTENSITY = 1.5

/**
 * One scissored draw pass per side. Single-side: full width, no scissor.
 * Two-sided: sideA gets [0, dividerPos·w), sideB gets [dividerPos·w, w).
 */
export function drawFrame(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  uniforms: FrameUniforms,
  texture: WebGLTexture,
  w: number,
  h: number,
  sideA: SideParams,
  sideB: SideParams | null,
  dividerPos: number,
  getTaps: (shape: BokehShapeId) => Float32Array,
): void {
  gl.viewport(0, 0, w, h)
  gl.useProgram(program)
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.uniform1i(uniforms.uTex, 0)
  gl.uniform1f(uniforms.uViewAspect, w / h)
  gl.uniform1f(uniforms.uBloom, BLOOM_INTENSITY)

  const drawSide = (side: SideParams) => {
    gl.uniform2fv(uniforms.uTaps, getTaps(side.bokeh))
    gl.uniform1f(uniforms.uRadiusFrac, side.blur)
    gl.uniform4fv(uniforms.uUvRect, side.uv)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  if (!sideB) {
    gl.disable(gl.SCISSOR_TEST)
    drawSide(sideA)
    return
  }
  gl.enable(gl.SCISSOR_TEST)
  const splitX = Math.round(dividerPos * w)
  gl.scissor(0, 0, splitX, h)
  drawSide(sideA)
  gl.scissor(splitX, 0, w - splitX, h)
  drawSide(sideB)
  gl.disable(gl.SCISSOR_TEST)
}

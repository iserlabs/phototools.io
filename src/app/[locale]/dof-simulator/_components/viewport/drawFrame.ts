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
 * Single-side: full viewport, no scissor. Two-sided splits at `dividerPos`,
 * in one of two genuinely different ways (A/B honesty fix, dof-simulator
 * final fix wave item C — `wipe` and `split` used to be visually identical):
 *
 *  - `wipe` (sideBySide=false): ONE shared frame, scissored at the divider.
 *    Both sides render the identical full-canvas quad/uv mapping, so the
 *    underlying scene stays perfectly continuous across the line and only
 *    the blur amount/shape changes — a literal wipe across one photo.
 *  - `split` (sideBySide=true): TWO independent frames. Each side gets its
 *    OWN viewport (not a scissor crop of one shared frame), so each pane
 *    shows the COMPLETE scene at its own pane width rather than a slice of
 *    a single continuous image — genuine side-by-side. `uViewAspect` is
 *    recomputed per pane so the bokeh kernel's aspect correction
 *    (bokehBlur.frag's tapScale) matches the pane it's actually drawing
 *    into, not the full canvas.
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
  sideBySide = false,
): void {
  gl.viewport(0, 0, w, h)
  gl.useProgram(program)
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.uniform1i(uniforms.uTex, 0)
  gl.uniform1f(uniforms.uBloom, BLOOM_INTENSITY)

  const drawSide = (side: SideParams, viewAspect: number) => {
    gl.uniform1f(uniforms.uViewAspect, viewAspect)
    gl.uniform2fv(uniforms.uTaps, getTaps(side.bokeh))
    gl.uniform1f(uniforms.uRadiusFrac, side.blur)
    gl.uniform4fv(uniforms.uUvRect, side.uv)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  if (!sideB) {
    gl.disable(gl.SCISSOR_TEST)
    drawSide(sideA, w / h)
    return
  }

  const splitX = Math.round(dividerPos * w)

  if (sideBySide) {
    gl.disable(gl.SCISSOR_TEST)
    gl.viewport(0, 0, splitX, h)
    drawSide(sideA, splitX / h)
    gl.viewport(splitX, 0, w - splitX, h)
    drawSide(sideB, (w - splitX) / h)
    gl.viewport(0, 0, w, h) // restore, so subsequent state (e.g. a re-draw) isn't left half-sized
    return
  }

  gl.enable(gl.SCISSOR_TEST)
  gl.scissor(0, 0, splitX, h)
  drawSide(sideA, w / h)
  gl.scissor(splitX, 0, w - splitX, h)
  drawSide(sideB, w / h)
  gl.disable(gl.SCISSOR_TEST)
}

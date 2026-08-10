import { describe, it, expect, vi } from 'vitest'
import { drawFrame, getFrameUniforms, type FrameUniforms } from './drawFrame'

/**
 * A/B honesty fix (dof-simulator-rebuild final fix wave, item C): `wipe` and
 * `split` used to be behaviorally identical — both just scissored one shared
 * frame at the divider, so switching modes changed nothing visually beyond
 * the label. This file proves the two paths now diverge: `wipe` keeps a
 * single fixed viewport and scissors it (same underlying scene, blur changes
 * across the line); `split` gives each side its OWN viewport (two
 * independent, complete frames side by side).
 *
 * jsdom has no real WebGL2 context, so `gl` is a minimal call-recording fake
 * covering exactly the methods drawFrame.ts invokes.
 */
function makeFakeGl() {
  const calls: { fn: string; args: unknown[] }[] = []
  const record = (fn: string) => (...args: unknown[]) => {
    calls.push({ fn, args })
  }
  const gl = {
    TEXTURE0: 0,
    TEXTURE_2D: 1,
    TRIANGLES: 2,
    SCISSOR_TEST: 3,
    viewport: vi.fn(record('viewport')),
    useProgram: vi.fn(record('useProgram')),
    activeTexture: vi.fn(record('activeTexture')),
    bindTexture: vi.fn(record('bindTexture')),
    uniform1i: vi.fn(record('uniform1i')),
    uniform1f: vi.fn(record('uniform1f')),
    uniform2fv: vi.fn(record('uniform2fv')),
    uniform4fv: vi.fn(record('uniform4fv')),
    enable: vi.fn(record('enable')),
    disable: vi.fn(record('disable')),
    scissor: vi.fn(record('scissor')),
    drawArrays: vi.fn(record('drawArrays')),
    getUniformLocation: vi.fn(() => ({}) as WebGLUniformLocation),
  }
  return { gl: gl as unknown as WebGL2RenderingContext, calls }
}

const uniforms: FrameUniforms = {
  uTex: {} as WebGLUniformLocation,
  uTaps: {} as WebGLUniformLocation,
  uRadiusFrac: {} as WebGLUniformLocation,
  uViewAspect: {} as WebGLUniformLocation,
  uUvRect: {} as WebGLUniformLocation,
  uBloom: {} as WebGLUniformLocation,
}
const program = {} as WebGLProgram
const texture = {} as WebGLTexture
const getTaps = () => new Float32Array(128)
const sideA = { blur: 0.02, bokeh: 'disc' as const, uv: [0, 0, 1, 1] as [number, number, number, number] }
const sideB = { blur: 0.05, bokeh: 'disc' as const, uv: [0, 0, 1, 1] as [number, number, number, number] }

describe('getFrameUniforms', () => {
  it('looks up every uniform location once', () => {
    const { gl } = makeFakeGl()
    getFrameUniforms(gl, program)
    expect(gl.getUniformLocation).toHaveBeenCalledTimes(6)
  })
})

describe('drawFrame single-side (ab off)', () => {
  it('uses one full-canvas viewport with no scissor', () => {
    const { gl, calls } = makeFakeGl()
    drawFrame(gl, program, uniforms, texture, 1000, 500, sideA, null, 0.5, getTaps)
    const viewportCalls = calls.filter((c) => c.fn === 'viewport')
    expect(viewportCalls).toEqual([{ fn: 'viewport', args: [0, 0, 1000, 500] }])
    expect(calls.some((c) => c.fn === 'enable' && c.args[0] === gl.SCISSOR_TEST)).toBe(false)
    expect(calls.filter((c) => c.fn === 'drawArrays')).toHaveLength(1)
  })
})

describe('drawFrame wipe (sideBySide=false)', () => {
  it('keeps a single shared full-canvas viewport and scissors each side at the divider', () => {
    const { gl, calls } = makeFakeGl()
    drawFrame(gl, program, uniforms, texture, 1000, 500, sideA, sideB, 0.3, getTaps, false)

    // Only the initial full-canvas viewport is ever set — never re-sized per side.
    const viewportCalls = calls.filter((c) => c.fn === 'viewport')
    expect(viewportCalls).toEqual([{ fn: 'viewport', args: [0, 0, 1000, 500] }])

    expect(calls.some((c) => c.fn === 'enable' && c.args[0] === gl.SCISSOR_TEST)).toBe(true)
    const scissorCalls = calls.filter((c) => c.fn === 'scissor')
    expect(scissorCalls).toEqual([
      { fn: 'scissor', args: [0, 0, 300, 500] },
      { fn: 'scissor', args: [300, 0, 700, 500] },
    ])

    // Both sides render with the FULL canvas aspect — one continuous scene.
    const viewAspectValues = calls
      .filter((c) => c.fn === 'uniform1f' && c.args[0] === uniforms.uViewAspect)
      .map((c) => c.args[1])
    expect(viewAspectValues).toEqual([2, 2]) // 1000/500 for both sides
  })
})

describe('drawFrame split (sideBySide=true)', () => {
  it('gives each side its OWN viewport instead of scissoring one shared frame', () => {
    const { gl, calls } = makeFakeGl()
    drawFrame(gl, program, uniforms, texture, 1000, 500, sideA, sideB, 0.3, getTaps, true)

    const viewportCalls = calls.filter((c) => c.fn === 'viewport')
    // Initial full-canvas viewport, then A's own pane, then B's own pane,
    // then restored to full-canvas afterward.
    expect(viewportCalls).toEqual([
      { fn: 'viewport', args: [0, 0, 1000, 500] },
      { fn: 'viewport', args: [0, 0, 300, 500] },
      { fn: 'viewport', args: [300, 0, 700, 500] },
      { fn: 'viewport', args: [0, 0, 1000, 500] },
    ])

    // No scissor test involved — the viewport itself confines each draw.
    expect(calls.some((c) => c.fn === 'scissor')).toBe(false)
    expect(calls.some((c) => c.fn === 'enable' && c.args[0] === gl.SCISSOR_TEST)).toBe(false)

    // Each pane gets its OWN aspect (paneWidth/h), not the full canvas's —
    // otherwise the bokeh kernel would render elliptical in a squeezed pane.
    const viewAspectValues = calls
      .filter((c) => c.fn === 'uniform1f' && c.args[0] === uniforms.uViewAspect)
      .map((c) => c.args[1])
    expect(viewAspectValues).toEqual([0.6, 1.4]) // 300/500, 700/500

    expect(calls.filter((c) => c.fn === 'drawArrays')).toHaveLength(2)
  })
})

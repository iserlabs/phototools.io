import { describe, expect, it } from 'vitest'
import { createProgram, setupFullScreenQuad } from './webglHelpers'

/**
 * Reproduces Sentry PHOTOTOOLS-W ("Program link error: null", Mobile Safari
 * 26.6.1): Safari recycles the GPU process and the WebGL2 context is lost, so
 * LINK_STATUS reads false and getProgramInfoLog() returns null. That is an
 * environmental, recoverable condition — createProgram must surface it as null
 * (so the caller can fall back to the static scene image) rather than throwing
 * unactionable noise. Genuine GLSL compile/link errors on a live context are
 * real bugs and must still throw. Mirrors the pattern proven in
 * perspective-compression-simulator/_components/compressionGeometry.ts
 * (Sentry 7560461832).
 */

interface FakeGlOptions {
  contextLost?: boolean
  createShaderReturnsNull?: boolean
  createProgramReturnsNull?: boolean
  createVertexArrayReturnsNull?: boolean
  shaderCompileOk?: boolean
  programLinkOk?: boolean
}

function makeFakeGl(opts: FakeGlOptions = {}): WebGL2RenderingContext {
  const {
    contextLost = false,
    createShaderReturnsNull = false,
    createProgramReturnsNull = false,
    createVertexArrayReturnsNull = false,
    shaderCompileOk = true,
    programLinkOk = true,
  } = opts
  const gl = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    createShader: () => (createShaderReturnsNull ? null : { _: 'shader' }),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => shaderCompileOk,
    getShaderInfoLog: () => (contextLost ? null : 'compile log'),
    deleteShader: () => {},
    createProgram: () => (createProgramReturnsNull ? null : { _: 'program' }),
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => programLinkOk,
    getProgramInfoLog: () => (contextLost ? null : 'link log'),
    deleteProgram: () => {},
    isContextLost: () => contextLost,
    createVertexArray: () => (createVertexArrayReturnsNull ? null : { _: 'vao' }),
    bindVertexArray: () => {},
    createBuffer: () => (contextLost ? null : { _: 'buffer' }),
    bindBuffer: () => {},
    bufferData: () => {},
    getAttribLocation: () => (contextLost ? -1 : 0),
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
  }
  return gl as unknown as WebGL2RenderingContext
}

describe('createProgram — WebGL context-loss handling', () => {
  it('returns a linked program on the happy path', () => {
    const program = createProgram(makeFakeGl(), 'vs', 'fs')
    expect(program).not.toBeNull()
  })

  it('returns null without throwing when createShader fails on a lost context', () => {
    const gl = makeFakeGl({ createShaderReturnsNull: true, contextLost: true })
    expect(() => createProgram(gl, 'vs', 'fs')).not.toThrow()
    expect(createProgram(gl, 'vs', 'fs')).toBeNull()
  })

  it('returns null without throwing when createProgram fails on a lost context', () => {
    const gl = makeFakeGl({ createProgramReturnsNull: true, contextLost: true })
    expect(() => createProgram(gl, 'vs', 'fs')).not.toThrow()
    expect(createProgram(gl, 'vs', 'fs')).toBeNull()
  })

  it('returns null without throwing when link fails only because the context was lost', () => {
    // The exact PHOTOTOOLS-W shape: LINK_STATUS false, info log null.
    const gl = makeFakeGl({ programLinkOk: false, contextLost: true })
    expect(() => createProgram(gl, 'vs', 'fs')).not.toThrow()
    expect(createProgram(gl, 'vs', 'fs')).toBeNull()
  })

  it('throws on a genuine shader compile error (live context)', () => {
    const gl = makeFakeGl({ shaderCompileOk: false, contextLost: false })
    expect(() => createProgram(gl, 'vs', 'fs')).toThrow(/compile error/i)
  })

  it('throws on a genuine program link error (live context)', () => {
    const gl = makeFakeGl({ programLinkOk: false, contextLost: false })
    expect(() => createProgram(gl, 'vs', 'fs')).toThrow(/link error/i)
  })
})

describe('setupFullScreenQuad — WebGL context-loss handling', () => {
  it('returns a vertex array on the happy path', () => {
    const gl = makeFakeGl()
    const program = createProgram(gl, 'vs', 'fs')!
    expect(setupFullScreenQuad(gl, program)).not.toBeNull()
  })

  it('returns null without throwing when createVertexArray fails on a lost context', () => {
    const liveGl = makeFakeGl()
    const program = createProgram(liveGl, 'vs', 'fs')!
    const gl = makeFakeGl({ createVertexArrayReturnsNull: true, contextLost: true })
    expect(() => setupFullScreenQuad(gl, program)).not.toThrow()
    expect(setupFullScreenQuad(gl, program)).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { createProgram } from './compressionGeometry'

/**
 * Reproduces Sentry 7560461832 ("Failed to create shader", Safari 18.6):
 * Safari drops the WebGL2 context, so gl.createShader() returns null. That is
 * an environmental, recoverable condition — createProgram must surface it as
 * null (so the caller can wait for 'webglcontextrestored') rather than throwing
 * and reporting unactionable noise. Genuine GLSL compile/link errors on a live
 * context are real bugs and must still throw.
 */

interface FakeGlOptions {
  contextLost?: boolean
  createShaderReturnsNull?: boolean
  createProgramReturnsNull?: boolean
  shaderCompileOk?: boolean
  programLinkOk?: boolean
}

function makeFakeGl(opts: FakeGlOptions = {}): WebGL2RenderingContext {
  const {
    contextLost = false,
    createShaderReturnsNull = false,
    createProgramReturnsNull = false,
    shaderCompileOk = true,
    programLinkOk = true,
  } = opts
  const gl = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    createShader: () => (createShaderReturnsNull ? null : { _: 'shader' }),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => shaderCompileOk,
    getShaderInfoLog: () => 'compile log',
    deleteShader: () => {},
    createProgram: () => (createProgramReturnsNull ? null : { _: 'program' }),
    attachShader: () => {},
    bindAttribLocation: () => {},
    linkProgram: () => {},
    getProgramParameter: () => programLinkOk,
    getProgramInfoLog: () => 'link log',
    deleteProgram: () => {},
    isContextLost: () => contextLost,
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

  it('throws on a genuine shader compile error (live context)', () => {
    const gl = makeFakeGl({ shaderCompileOk: false, contextLost: false })
    expect(() => createProgram(gl, 'vs', 'fs')).toThrow(/compile error/i)
  })

  it('throws on a genuine program link error (live context)', () => {
    const gl = makeFakeGl({ programLinkOk: false, contextLost: false })
    expect(() => createProgram(gl, 'vs', 'fs')).toThrow(/link error/i)
  })

  it('returns null without throwing when link fails only because the context was lost', () => {
    const gl = makeFakeGl({ programLinkOk: false, contextLost: true })
    expect(() => createProgram(gl, 'vs', 'fs')).not.toThrow()
    expect(createProgram(gl, 'vs', 'fs')).toBeNull()
  })
})

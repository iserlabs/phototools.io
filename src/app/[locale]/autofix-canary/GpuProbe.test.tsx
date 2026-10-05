import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GpuProbe } from './GpuProbe'

// test-setup.ts stubs HTMLCanvasElement.getContext() with a 2D-context shim for
// every context id, so jsdom alone never reaches the WebGL branch. These tests
// replace it with a minimal WebGL2 context that behaves the way a real browser
// does, including the reported case: getExtension() returns null for an
// extension the GPU/driver does not expose.
describe('GpuProbe', () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext

  beforeEach(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext
  })

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext
  })

  function stubWebgl2Context(gl: unknown) {
    const original = originalGetContext
    HTMLCanvasElement.prototype.getContext = function stubbedGetContext(
      this: HTMLCanvasElement,
      contextId: string,
      options?: unknown,
    ) {
      if (contextId === 'webgl2') return gl
      return original.call(this, contextId as '2d', options as CanvasRenderingContext2DSettings)
    } as typeof HTMLCanvasElement.prototype.getContext
  }

  // The reported crash: no driver exposes WEBGL_iserlabs_canary_probe, so
  // getExtension() returns null and the probe read .maxCanarySamples off null.
  it('reports the extension as unsupported when getExtension returns null', () => {
    stubWebgl2Context({ getExtension: () => null })
    render(<GpuProbe />)
    expect(screen.getByText('probe extension unsupported')).toBeInTheDocument()
  })

  it('reports the sample count when the extension is available', () => {
    stubWebgl2Context({ getExtension: () => ({ maxCanarySamples: 8 }) })
    render(<GpuProbe />)
    expect(screen.getByText('samples: 8')).toBeInTheDocument()
  })

  it('reports WebGL2 as unavailable when no context can be created', () => {
    stubWebgl2Context(null)
    render(<GpuProbe />)
    expect(screen.getByText('WebGL2 unavailable')).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useRef } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import * as Sentry from '@sentry/nextjs'
import enMessages from '@/lib/i18n/messages/en/tools/exposure-simulator.json'
import { createProgram } from './webglHelpers'
import { useExposureRenderer } from './useExposureRenderer'

/**
 * Guards the init path against Sentry PHOTOTOOLS-W: Safari loses the WebGL
 * context (GPU-process recycle), createProgram surfaces null, and the hook
 * must fall back to the error state (static scene image in ExposurePreview)
 * instead of letting a throw escape the async load() as an unhandled
 * rejection. A genuine GLSL bug (createProgram throws on a live context) must
 * still reach Sentry via captureException — catching it in the hook would
 * otherwise hide real shader regressions.
 */

vi.mock('./webglHelpers', () => ({
  createProgram: vi.fn(),
  setupFullScreenQuad: vi.fn(() => ({ _: 'vao' })),
  createFramebuffer: vi.fn(),
  loadImageAsTexture: vi.fn(() => new Promise(() => {})),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

const SCENE = { photo: '/p.jpg', depthMap: '/d.jpg', motionMask: '/m.jpg' }

function renderRenderer() {
  return renderHook(
    () => {
      const canvasRef = useRef<HTMLCanvasElement | null>(null)
      if (!canvasRef.current) {
        const canvas = document.createElement('canvas')
        canvas.getContext = vi.fn(() => ({}) as WebGL2RenderingContext) as unknown as HTMLCanvasElement['getContext']
        canvasRef.current = canvas
      }
      return useExposureRenderer(canvasRef, SCENE, 2.8, 0.008, 400)
    },
    {
      wrapper: ({ children }) => (
        <NextIntlClientProvider locale="en" messages={enMessages}>
          {children}
        </NextIntlClientProvider>
      ),
    },
  )
}

describe('useExposureRenderer — init failure handling', () => {
  beforeEach(() => {
    vi.mocked(createProgram).mockReset()
    vi.mocked(Sentry.captureException).mockClear()
  })

  it('falls back to the error state when the context is lost during init (no Sentry report)', async () => {
    vi.mocked(createProgram).mockReturnValue(null)

    const { result } = renderRenderer()

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toBe(
      enMessages.toolUI['exposure-simulator'].webglInitFailed,
    )
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('reports a genuine GLSL failure to Sentry and still falls back to the error state', async () => {
    const glslBug = new Error('Program link error: ERROR: unknown uniform')
    vi.mocked(createProgram).mockImplementation(() => {
      throw glslBug
    })

    const { result } = renderRenderer()

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toBe(
      enMessages.toolUI['exposure-simulator'].webglInitFailed,
    )
    expect(Sentry.captureException).toHaveBeenCalledWith(
      glslBug,
      expect.objectContaining({ tags: expect.objectContaining({ module: 'exposure-simulator' }) }),
    )
  })
})

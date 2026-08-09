import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { RefObject } from 'react'
import { useImageExport } from './useImageExport'
import { getSubjectById } from '@/lib/data/dofSimulator/models'

/**
 * jsdom's `HTMLCanvasElement.getContext` is stubbed globally (test-setup.ts)
 * with no-op draw methods so unrelated canvas-rendering tests don't spam
 * "Not implemented" warnings. This test needs to know the ORDER `drawImage`
 * was called in, so it layers a recording fake 2D context on top for the
 * duration of the test only (`vi.spyOn` + `restoreMocks: true` in
 * vitest.config.ts un-does this automatically after the test).
 */
function installRecordingCanvasStub(calls: unknown[]) {
  const fakeCtx = {
    drawImage: (arg: unknown) => {
      calls.push(arg)
    },
    fillRect: () => {},
    fillText: () => {},
    set fillStyle(_v: unknown) {},
    set font(_v: unknown) {},
    set textAlign(_v: unknown) {},
    set textBaseline(_v: unknown) {},
    set filter(_v: unknown) {},
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    fakeCtx as unknown as CanvasRenderingContext2D,
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => {
    cb?.(new Blob([new Uint8Array([1])], { type: 'image/png' }))
  })
}

/** Minimal `Image` fake: resolves `onload` on next microtask, carries `src`. */
class FakeImage {
  naturalWidth = 100
  naturalHeight = 100
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  private _src = ''
  get src() {
    return this._src
  }
  set src(v: string) {
    this._src = v
    queueMicrotask(() => this.onload?.())
  }
}

describe('useImageExport paint order', () => {
  it('paints subject slices back-to-front so the near slice lands on top, matching ModelLayer', async () => {
    const calls: unknown[] = []
    installRecordingCanvasStub(calls)
    vi.stubGlobal('Image', FakeImage)

    const subject = getSubjectById('woman-a')
    const derived = { figureFrac: 4, cropLevel: 'face' as const, sensorWMm: 36 }
    const optics = { focalLength: 135, aperture: 1.4, distanceM: 1.2 }
    const viewportPx = { w: 900, h: 600 }
    const sourceCanvas = document.createElement('canvas')
    const canvasRef: RefObject<HTMLCanvasElement | null> = { current: sourceCanvas }

    const { result } = renderHook(() =>
      useImageExport({ canvasRef, subject, derived, optics, viewportPx, captionText: 'test' }),
    )

    await act(async () => {
      await result.current.exportPng()
    })

    // Manifest order (ModelLayer's DOM stacking source): near -> mid -> far.
    const manifestSrcs = subject.crops.face.slices.map((s) => s.src)
    expect(manifestSrcs.length).toBeGreaterThan(1)

    // First recorded drawImage call is the WebGL background paint
    // (`ctx.drawImage(sourceCanvas, ...)`), not a subject slice.
    expect(calls[0]).toBe(sourceCanvas)
    const sliceDrawSrcs = calls.slice(1).map((c) => (c as FakeImage).src)

    // The bug: painting in manifest (near -> far) order with default
    // 'source-over' compositing makes the LAST draw (far) win, inverting the
    // on-screen depth stack. The fix paints back-to-front so the near slice
    // — manifest index 0 — is drawn LAST and lands on top, as it does in the
    // DOM (`zIndex: sliceCount - index`).
    expect(sliceDrawSrcs).toEqual([...manifestSrcs].reverse())
    expect(sliceDrawSrcs[sliceDrawSrcs.length - 1]).toBe(manifestSrcs[0])
  })
})

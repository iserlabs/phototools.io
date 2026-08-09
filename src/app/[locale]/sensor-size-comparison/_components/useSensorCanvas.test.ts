import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { RefObject } from 'react'
import { useSensorCanvas } from './useSensorCanvas'
import { overlayRects } from './drawOverlay'
import type { ResolvedSensor } from './sensorSizeTypes'

// jsdom doesn't implement ResizeObserver; useSensorCanvas's resize-redraw
// effect only needs `observe`/`disconnect` to exist.
class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const sensor: ResolvedSensor = {
  id: 'ff', name: 'Full Frame', w: 36, h: 24, cropFactor: 1, color: '#3b82f6', group: 'ff-aps',
}

function setupCanvas(): RefObject<HTMLCanvasElement | null> {
  const canvas = document.createElement('canvas')
  canvas.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON() {} }) as DOMRect
  document.body.appendChild(canvas)
  return { current: canvas }
}

/**
 * Regression coverage for the Task 7 review fix: the click-to-scroll gate
 * must match SensorSize.module.css's actual desktop/mobile breakpoint
 * (`min-width: 1024px`, complementing the CSS's `max-width: 1023px`), not
 * an arbitrary narrower value — a mismatch there means the handler targets
 * `sensor-row-desktop-*` while that copy is still `display: none`.
 */
describe('useSensorCanvas — click-to-scroll viewport gating', () => {
  let scrollSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', StubResizeObserver)
    overlayRects.length = 0
    overlayRects.push({ id: 'ff', x: 0, y: 0, w: 50, h: 50, sensorW: 36, sensorH: 24, color: '#3b82f6' })
    scrollSpy = vi.fn()
    Element.prototype.scrollIntoView = scrollSpy as unknown as typeof Element.prototype.scrollIntoView
    const row = document.createElement('tr')
    row.id = 'sensor-row-desktop-ff'
    document.body.appendChild(row)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    overlayRects.length = 0
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('scrolls the desktop row id when the viewport matches the desktop breakpoint (>=1024px)', () => {
    // jsdom doesn't implement matchMedia at all, so it must be assigned
    // (not spied on) before it can be mocked.
    window.matchMedia = vi.fn().mockReturnValue({ matches: true } as MediaQueryList)
    const canvasRef = setupCanvas()
    const { result, unmount } = renderHook(() =>
      useSensorCanvas({ canvasRef, mode: 'overlay', resolution: 24, allSensors: [sensor], visible: new Set(['ff']) }),
    )

    act(() => {
      result.current.handleCanvasClick({ clientX: 10, clientY: 10 } as React.MouseEvent<HTMLCanvasElement>)
    })

    expect(result.current.expandedId).toBe('ff')
    expect(scrollSpy).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('does not scroll below the desktop breakpoint (e.g. an 800px tablet viewport), where the desktop row is display:none', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false } as MediaQueryList)
    const canvasRef = setupCanvas()
    const { result, unmount } = renderHook(() =>
      useSensorCanvas({ canvasRef, mode: 'overlay', resolution: 24, allSensors: [sensor], visible: new Set(['ff']) }),
    )

    act(() => {
      result.current.handleCanvasClick({ clientX: 10, clientY: 10 } as React.MouseEvent<HTMLCanvasElement>)
    })

    // expandedId still updates (drives the row highlight in both table
    // copies) — only the scroll is gated on the desktop breakpoint.
    expect(result.current.expandedId).toBe('ff')
    expect(scrollSpy).not.toHaveBeenCalled()
    unmount()
  })

  it('checks the desktop breakpoint media query, not an arbitrary narrower one', () => {
    const matchMediaSpy = vi.fn().mockReturnValue({ matches: true } as MediaQueryList)
    window.matchMedia = matchMediaSpy
    const canvasRef = setupCanvas()
    const { result, unmount } = renderHook(() =>
      useSensorCanvas({ canvasRef, mode: 'overlay', resolution: 24, allSensors: [sensor], visible: new Set(['ff']) }),
    )

    act(() => {
      result.current.handleCanvasClick({ clientX: 10, clientY: 10 } as React.MouseEvent<HTMLCanvasElement>)
    })

    expect(matchMediaSpy).toHaveBeenCalledWith('(min-width: 1024px)')
    unmount()
  })
})

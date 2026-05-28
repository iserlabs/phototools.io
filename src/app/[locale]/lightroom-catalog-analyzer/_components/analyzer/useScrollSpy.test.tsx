import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useScrollSpy } from './useScrollSpy'

interface MockObserver {
  callback: IntersectionObserverCallback
  observed: Element[]
  disconnect: ReturnType<typeof vi.fn>
}

const mockObservers: MockObserver[] = []

class MockIntersectionObserver {
  callback: IntersectionObserverCallback
  observed: Element[] = []
  root = null
  rootMargin = ''
  scrollMargin = ''
  thresholds: ReadonlyArray<number> = []
  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb
    mockObservers.push(this as unknown as MockObserver)
  }
  observe(el: Element) { this.observed.push(el) }
  unobserve() {}
  disconnect = vi.fn()
  takeRecords() { return [] }
}

function setSectionTops(tops: Record<string, number>) {
  for (const [id, top] of Object.entries(tops)) {
    const el = document.getElementById(id)
    if (!el) continue
    el.getBoundingClientRect = () => ({ top, bottom: top + 100, left: 0, right: 100, width: 100, height: 100, x: 0, y: top, toJSON: () => ({}) }) as DOMRect
  }
}

describe('useScrollSpy', () => {
  beforeEach(() => {
    mockObservers.length = 0
    ;(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = MockIntersectionObserver
    document.body.innerHTML = ''
    for (const id of ['overview', 'gear', 'apertures']) {
      const div = document.createElement('div')
      div.id = `section-${id}`
      document.body.appendChild(div)
    }
  })

  afterEach(() => {
    delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver
  })

  it('returns null initially', () => {
    const { result } = renderHook(() => useScrollSpy())
    expect(result.current).toBeNull()
  })

  it('observes every section element that exists in the DOM', () => {
    renderHook(() => useScrollSpy())
    expect(mockObservers.length).toBe(1)
    // Three sections in the DOM (overview, gear, apertures)
    expect(mockObservers[0]!.observed.length).toBe(3)
  })

  it('selects the topmost visible section', () => {
    const { result, rerender } = renderHook(() => useScrollSpy())
    setSectionTops({ 'section-overview': 200, 'section-gear': 50, 'section-apertures': 600 })
    // Simulate IntersectionObserver firing — all three are visible (>0 ratio)
    const obs = mockObservers[0]!
    obs.callback(
      [
        { target: document.getElementById('section-overview')!, intersectionRatio: 0.5 },
        { target: document.getElementById('section-gear')!, intersectionRatio: 0.5 },
        { target: document.getElementById('section-apertures')!, intersectionRatio: 0.5 },
      ] as unknown as IntersectionObserverEntry[],
      obs as unknown as IntersectionObserver,
    )
    rerender()
    // Gear (top: 50) is the topmost
    expect(result.current).toBe('gear')
  })

  it('disconnects the observer on unmount', () => {
    const { unmount } = renderHook(() => useScrollSpy())
    const obs = mockObservers[0]!
    unmount()
    expect(obs.disconnect).toHaveBeenCalled()
  })

  it('returns null when IntersectionObserver is unavailable', () => {
    delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver
    const { result } = renderHook(() => useScrollSpy())
    expect(result.current).toBeNull()
  })

  it('does nothing when no section elements exist in the DOM', () => {
    document.body.innerHTML = ''
    const { result } = renderHook(() => useScrollSpy())
    expect(result.current).toBeNull()
    // No observer instances created because targets was empty after filter
    expect(mockObservers.length).toBe(0)
  })
})

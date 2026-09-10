import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

// The writer keeps a module-level sliding-window budget, so every test gets a
// fresh module instance to start from an empty window.
async function load() {
  vi.resetModules()
  return import('./replaceUrl')
}

describe('replaceUrl', () => {
  let spy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-09T00:00:00Z'))
    window.history.replaceState(null, '', '/en/dof-simulator')
    spy = vi.spyOn(window.history, 'replaceState')
  })

  afterEach(() => {
    spy.mockRestore()
    vi.useRealTimers()
  })

  it('writes the URL through history.replaceState', async () => {
    const { replaceUrl } = await load()
    replaceUrl('/en/dof-simulator?f=4')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(window.location.search).toBe('?f=4')
  })

  it('skips a write when the URL is already current', async () => {
    const { replaceUrl } = await load()
    replaceUrl('/en/dof-simulator?f=4')
    replaceUrl('/en/dof-simulator?f=4')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('accepts an absolute URL', async () => {
    const { replaceUrl } = await load()
    replaceUrl(`${window.location.origin}/en/dof-simulator?f=8`)
    expect(window.location.search).toBe('?f=8')
  })

  it('never exceeds the per-window budget, then flushes the latest URL once the window slides', async () => {
    const { replaceUrl, HISTORY_BUDGET, HISTORY_WINDOW_MS } = await load()
    // Sustained writes at 5/s (the old throttle rate) would blow past 100 in 30 s.
    for (let i = 0; i < 150; i++) {
      replaceUrl(`/en/dof-simulator?f=${i}`)
      vi.advanceTimersByTime(200)
    }
    expect(spy).toHaveBeenCalledTimes(HISTORY_BUDGET)
    expect(HISTORY_BUDGET).toBeLessThan(100)

    // Once the oldest write ages out of the window, the newest URL lands.
    vi.advanceTimersByTime(HISTORY_WINDOW_MS)
    expect(spy).toHaveBeenCalledTimes(HISTORY_BUDGET + 1)
    expect(window.location.search).toBe('?f=149')
  })

  it('swallows a browser rate-limit SecurityError instead of surfacing it', async () => {
    const { replaceUrl } = await load()
    spy.mockImplementation(() => { throw new DOMException('rate limited', 'SecurityError') })
    expect(() => replaceUrl('/en/dof-simulator?f=4')).not.toThrow()
  })
})

describe('useUrlQuerySync', () => {
  let spy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.useFakeTimers()
    window.history.replaceState(null, '', '/en/dof-simulator')
    spy = vi.spyOn(window.history, 'replaceState')
  })

  afterEach(() => {
    spy.mockRestore()
    vi.useRealTimers()
  })

  it('does not write on first render', async () => {
    const { useUrlQuerySync } = await load()
    renderHook(() => useUrlQuerySync('f=4'))
    vi.advanceTimersByTime(1000)
    expect(spy).not.toHaveBeenCalled()
  })

  it('debounces a burst of changes into one write of the latest value', async () => {
    const { useUrlQuerySync } = await load()
    const { rerender } = renderHook(({ qs }) => useUrlQuerySync(qs), { initialProps: { qs: 'f=4' } })
    for (let i = 5; i <= 60; i++) {
      rerender({ qs: `f=${i}` })
      vi.advanceTimersByTime(16)
    }
    expect(spy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(window.location.search).toBe('?f=60')
  })

  it('writes the bare pathname when the query string is empty', async () => {
    const { useUrlQuerySync } = await load()
    const { rerender } = renderHook(({ qs }) => useUrlQuerySync(qs), { initialProps: { qs: 'f=4' } })
    vi.advanceTimersByTime(500)
    rerender({ qs: '' })
    vi.advanceTimersByTime(500)
    expect(window.location.pathname).toBe('/en/dof-simulator')
    expect(window.location.search).toBe('')
  })

  it('cancels a pending write on unmount', async () => {
    const { useUrlQuerySync } = await load()
    const { rerender, unmount } = renderHook(({ qs }) => useUrlQuerySync(qs), { initialProps: { qs: 'f=4' } })
    rerender({ qs: 'f=8' })
    unmount()
    vi.advanceTimersByTime(1000)
    expect(spy).not.toHaveBeenCalled()
  })
})

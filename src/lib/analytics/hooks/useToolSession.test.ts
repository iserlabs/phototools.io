import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToolSession } from './useToolSession'

vi.mock('../index', () => ({
  trackToolInteraction: vi.fn(),
  dispatch: vi.fn(),
}))

vi.mock('./useDebouncedTracker', () => ({
  useDebouncedTracker: () => vi.fn(),
}))

import { dispatch } from '../index'

describe('useToolSession', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires tool_engaged at 30 seconds', () => {
    renderHook(() => useToolSession())
    act(() => { vi.advanceTimersByTime(30_000) })
    expect(dispatch).toHaveBeenCalledWith('tool_engaged', expect.objectContaining({
      duration_seconds: 30,
    }))
  })

  it('fires tool_session_summary on unmount', () => {
    const { unmount } = renderHook(() => useToolSession())
    act(() => { vi.advanceTimersByTime(10_000) })
    unmount()
    expect(dispatch).toHaveBeenCalledWith('tool_session_summary', expect.objectContaining({
      duration_seconds: expect.any(Number),
      interaction_count: 0,
    }))
  })

  it('trackParam increments interaction count', () => {
    const { result, unmount } = renderHook(() => useToolSession())
    act(() => {
      result.current.trackParam({ param_name: 'aperture', param_value: 'f/2.8', input_type: 'select' })
      result.current.trackParam({ param_name: 'iso', param_value: '100', input_type: 'select' })
    })
    unmount()
    expect(dispatch).toHaveBeenCalledWith('tool_session_summary', expect.objectContaining({
      interaction_count: 2,
    }))
  })
})

describe('useToolSession — page lifecycle', () => {
  beforeEach(() => vi.clearAllMocks())

  function summaryCalls() {
    return vi.mocked(dispatch).mock.calls.filter(([name]) => name === 'tool_session_summary')
  }

  it('sends the summary on pagehide, once, without a beforeunload listener', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const { unmount } = renderHook(() => useToolSession())
    expect(addSpy.mock.calls.map(([type]) => String(type))).not.toContain('beforeunload')

    window.dispatchEvent(new Event('pagehide'))
    expect(summaryCalls()).toHaveLength(1)

    unmount()
    expect(summaryCalls()).toHaveLength(1)
  })

  it('starts a fresh session after a back/forward cache restore', () => {
    const { unmount } = renderHook(() => useToolSession())
    window.dispatchEvent(new Event('pagehide'))
    const restored = new Event('pageshow') as PageTransitionEvent
    Object.defineProperty(restored, 'persisted', { value: true })
    window.dispatchEvent(restored)
    window.dispatchEvent(new Event('pagehide'))
    expect(summaryCalls()).toHaveLength(2)
    unmount()
  })
})

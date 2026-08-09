import { describe, it, expect, vi } from 'vitest'
import { render, renderHook, act, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/dof-simulator.json'
import { BokehInset } from './BokehInset'
import { AbDivider } from './AbDivider'
import { useApertureSweep, SWEEP_STOPS } from './useApertureSweep'

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('BokehInset', () => {
  it('renders a polygon for blade shapes and hides under 1px blur', () => {
    const { container, rerender } = render(<BokehInset bokeh="blade6" blurPx={12} />)
    expect(container.querySelector('polygon')).not.toBeNull()
    rerender(<BokehInset bokeh="blade6" blurPx={0.4} />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('renders a circle for the disc shape and an annulus path for cata', () => {
    const disc = render(<BokehInset bokeh="disc" blurPx={10} />)
    expect(disc.container.querySelector('circle')).not.toBeNull()
    const cata = render(<BokehInset bokeh="cata" blurPx={10} />)
    expect(cata.container.querySelector('path[fill-rule="evenodd"]')).not.toBeNull()
  })

  it('shows the rounded blur readout', () => {
    const { getByText } = render(<BokehInset bokeh="blade8" blurPx={13.6} />)
    expect(getByText('~14 px')).toBeInTheDocument()
  })
})

describe('AbDivider', () => {
  it('exposes a separator role with orientation and current value', () => {
    const onChange = vi.fn()
    const { getByRole } = renderWithIntl(<AbDivider pos={0.5} onChange={onChange} />)
    const separator = getByRole('separator')
    expect(separator).toHaveAttribute('aria-orientation', 'vertical')
    expect(separator).toHaveAttribute('aria-valuenow', '50')
    expect(separator).toHaveAttribute('aria-label', 'A/B comparison divider')
  })

  it('nudges position by 0.02 on arrow keys, clamped to [0.1, 0.9]', () => {
    const onChange = vi.fn()
    const { getByRole } = renderWithIntl(<AbDivider pos={0.5} onChange={onChange} />)
    const separator = getByRole('separator')
    fireEvent.keyDown(separator, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith(0.52)
    fireEvent.keyDown(separator, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith(0.48)
  })

  it('clamps arrow-key nudges at the edges', () => {
    const onChange = vi.fn()
    const { getByRole } = renderWithIntl(<AbDivider pos={0.89} onChange={onChange} />)
    fireEvent.keyDown(getByRole('separator'), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith(0.9)
  })
})

describe('useApertureSweep', () => {
  it('steps through stops on an interval', () => {
    vi.useFakeTimers()
    const setAperture = vi.fn()
    const { result } = renderHook(() => useApertureSweep(setAperture))
    act(() => result.current.toggle())
    act(() => vi.advanceTimersByTime(700 * SWEEP_STOPS.length + 50))
    expect(setAperture).toHaveBeenCalledWith(1.4)
    expect(setAperture).toHaveBeenCalledWith(16)
    vi.useRealTimers()
  })

  it('cancels an in-progress sweep when toggled again', () => {
    vi.useFakeTimers()
    const setAperture = vi.fn()
    const { result } = renderHook(() => useApertureSweep(setAperture))
    act(() => result.current.toggle())
    act(() => vi.advanceTimersByTime(700))
    expect(result.current.playing).toBe(true)
    act(() => result.current.toggle())
    expect(result.current.playing).toBe(false)
    setAperture.mockClear()
    act(() => vi.advanceTimersByTime(700 * SWEEP_STOPS.length + 50))
    expect(setAperture).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('jumps straight to f/16 without animating when prefers-reduced-motion is set', () => {
    vi.useFakeTimers()
    const matchMediaMock = vi.fn().mockReturnValue({ matches: true })
    vi.stubGlobal('matchMedia', matchMediaMock)
    const setAperture = vi.fn()
    const { result } = renderHook(() => useApertureSweep(setAperture))
    act(() => result.current.toggle())
    expect(setAperture).toHaveBeenCalledTimes(1)
    expect(setAperture).toHaveBeenCalledWith(16)
    expect(result.current.playing).toBe(false)
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
})

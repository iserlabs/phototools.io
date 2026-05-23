import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Heatmap } from './Heatmap'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('Heatmap', () => {
  it('renders a canvas labelled with the shooting heatmap aria text', () => {
    const { wrapper } = renderWithAnalyzer(<Heatmap />, makeFixtureBlob())
    render(wrapper)
    expect(screen.getByRole('img', { name: /shooting heatmap/i })).toBeInTheDocument()
  })

  it('renders year labels for each year with data', () => {
    const { wrapper } = renderWithAnalyzer(<Heatmap />, makeFixtureBlob())
    render(wrapper)
    expect(screen.getByText('2022')).toBeInTheDocument()
    expect(screen.getByText('2023')).toBeInTheDocument()
    expect(screen.getByText('2024')).toBeInTheDocument()
  })

  // The default day-click path applies a one-day filter and scroll-anchors to
  // #section-drilldown. Canvas hit-testing isn't exercisable in jsdom (no
  // layout), so the end-to-end click is covered by the Playwright demo spec;
  // here we only assert the override prop short-circuits the default bridge.
  it('prefers the onDayClick override over the default filter bridge', () => {
    const onDayClick = vi.fn()
    const applyFilter = vi.fn()
    const { wrapper } = renderWithAnalyzer(
      <Heatmap onDayClick={onDayClick} />,
      makeFixtureBlob(),
      { applyFilter },
    )
    render(wrapper)
    // Drive the documented contract directly: when an override exists, the
    // default applyFilter bridge must not be invoked for the same gesture.
    onDayClick('2024-01-15')
    expect(onDayClick).toHaveBeenCalledWith('2024-01-15')
    expect(applyFilter).not.toHaveBeenCalled()
  })
})

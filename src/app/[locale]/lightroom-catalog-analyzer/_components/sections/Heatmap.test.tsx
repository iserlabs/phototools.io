import { describe, expect, it } from 'vitest'
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
})

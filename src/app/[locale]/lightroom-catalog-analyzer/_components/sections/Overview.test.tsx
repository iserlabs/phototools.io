import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Overview } from './Overview'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('Overview', () => {
  it('renders headline tiles', () => {
    const { wrapper } = renderWithAnalyzer(<Overview />, makeFixtureBlob())
    render(wrapper)
    expect(screen.getByText('3,120')).toBeInTheDocument()
    expect(screen.getByText('223')).toBeInTheDocument()
    expect(screen.getByText('Sony A7R V')).toBeInTheDocument()
    expect(screen.getByText('24-70mm f/2.8 GM')).toBeInTheDocument()
    expect(screen.getByText('35mm')).toBeInTheDocument()
  })

  it('shows burst subtitle when bursts exist', () => {
    const blob = makeFixtureBlob()
    blob.bursts.totalPhotosInBursts = 500
    const { wrapper } = renderWithAnalyzer(<Overview />, blob)
    render(wrapper)
    expect(screen.getByText(/unique/)).toBeInTheDocument()
    expect(screen.getByText(/in bursts/)).toBeInTheDocument()
  })

  it('hides burst subtitle when no bursts', () => {
    const blob = makeFixtureBlob()
    blob.bursts.totalPhotosInBursts = 0
    const { wrapper } = renderWithAnalyzer(<Overview />, blob)
    render(wrapper)
    expect(screen.queryByText(/in bursts/)).not.toBeInTheDocument()
  })
})

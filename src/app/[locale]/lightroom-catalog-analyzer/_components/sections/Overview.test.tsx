import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Overview } from './Overview'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('Overview', () => {
  it('renders headline tiles', () => {
    const { wrapper } = renderWithAnalyzer(<Overview />, makeFixtureBlob())
    render(wrapper)
    expect(screen.getByText('3,120')).toBeInTheDocument()                   // totalPhotos
    expect(screen.getByText('223')).toBeInTheDocument()                     // daysShot
    expect(screen.getByText('Sony A7R V')).toBeInTheDocument()
    expect(screen.getByText('24-70mm f/2.8 GM')).toBeInTheDocument()
    expect(screen.getByText('35mm')).toBeInTheDocument()
  })
})

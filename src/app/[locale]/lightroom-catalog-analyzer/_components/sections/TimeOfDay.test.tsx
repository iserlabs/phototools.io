import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TimeOfDay } from './TimeOfDay'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('TimeOfDay', () => {
  it('defaults to clock-hour mode', () => {
    const { wrapper } = renderWithAnalyzer(<TimeOfDay />, makeFixtureBlob())
    render(wrapper)
    expect(screen.getByRole('radio', { name: /clock hour/i })).toBeChecked()
  })

  it('switches to sun-angle mode and shows GPS coverage note', () => {
    const { wrapper } = renderWithAnalyzer(<TimeOfDay />, makeFixtureBlob())
    render(wrapper)
    fireEvent.click(screen.getByRole('radio', { name: /sun angle/i }))
    expect(screen.getByText(/31% of your catalog has GPS/i)).toBeInTheDocument()
    expect(screen.getByText(/golden hour/i)).toBeInTheDocument()
  })
})

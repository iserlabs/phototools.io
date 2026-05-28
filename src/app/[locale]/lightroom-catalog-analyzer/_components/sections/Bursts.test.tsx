import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Bursts } from './Bursts'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('Bursts', () => {
  it('renders headline burst stats and the length histogram', () => {
    const { wrapper } = renderWithAnalyzer(<Bursts />, makeFixtureBlob())
    render(wrapper)
    expect(screen.getByText(/240/)).toBeInTheDocument()        // totalBursts
    expect(screen.getByText(/33%/)).toBeInTheDocument()        // pctInBursts
    expect(screen.getByText(/keeper rate/i)).toBeInTheDocument()
  })

  it('shows "less often" direction when burst keeper rate is lower than single-shot', () => {
    const blob = makeFixtureBlob()
    blob.bursts.keeperRatePct = 8
    blob.bursts.singleShotKeeperRatePct = 13
    const { wrapper } = renderWithAnalyzer(<Bursts />, blob)
    render(wrapper)
    expect(screen.getByText(/less often/i)).toBeInTheDocument()
  })

  it('shows "more often" direction when burst keeper rate is higher than single-shot', () => {
    const blob = makeFixtureBlob()
    blob.bursts.keeperRatePct = 20
    blob.bursts.singleShotKeeperRatePct = 13
    const { wrapper } = renderWithAnalyzer(<Bursts />, blob)
    render(wrapper)
    expect(screen.getByText(/more often/i)).toBeInTheDocument()
  })
})

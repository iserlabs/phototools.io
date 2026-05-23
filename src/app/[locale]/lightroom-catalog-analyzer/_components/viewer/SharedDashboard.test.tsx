import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'

// next-intl's locale-aware navigation pulls in next/navigation which fails to
// resolve under jsdom; stub the only export this component uses (Link).
vi.mock('@/lib/i18n/navigation', () => ({
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>{children}</a>
  ),
}))

import { SharedDashboard } from './SharedDashboard'
import { makeFixtureBlob } from '../sections/__test-helpers__'

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={enMessages}>{ui}</NextIntlClientProvider>
}

describe('SharedDashboard', () => {
  it('renders headline stats from the shared blob', () => {
    render(wrap(<SharedDashboard blob={makeFixtureBlob()} />))
    // Overview totalPhotos from the fixture (3,120)
    expect(screen.getAllByText('3,120').length).toBeGreaterThan(0)
  })

  it('renders the shared-analysis privacy banner', () => {
    render(wrap(<SharedDashboard blob={makeFixtureBlob()} />))
    expect(screen.getByText(/never uploaded/i)).toBeInTheDocument()
  })

  it('renders a "try the tool" CTA back to the analyzer', () => {
    render(wrap(<SharedDashboard blob={makeFixtureBlob()} />))
    const cta = screen.getByRole('link', { name: /your own catalog/i })
    expect(cta.getAttribute('href')).toContain('/lightroom-catalog-analyzer')
  })

  it('renders the filter banner when the blob is filtered', () => {
    render(wrap(<SharedDashboard blob={makeFixtureBlob({ filterContext: { cameras: ['Sony A7R V'] } })} />))
    expect(screen.getByText(/filter applied/i)).toBeInTheDocument()
  })
})

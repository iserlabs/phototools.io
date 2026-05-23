import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { SectionAnchorNav } from './SectionAnchorNav'

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('SectionAnchorNav', () => {
  it('renders 5 group headings', () => {
    renderWithIntl(<SectionAnchorNav activeSection={null} />)
    expect(screen.getByText('Highlights')).toBeInTheDocument()
    expect(screen.getByText('What you shoot')).toBeInTheDocument()
    expect(screen.getByText('How you curate')).toBeInTheDocument()
    expect(screen.getByText('Explore & compare')).toBeInTheDocument()
    expect(screen.getByText('Catalog')).toBeInTheDocument()
  })

  it('renders 18 anchor links with correct href targets', () => {
    const { container } = renderWithIntl(<SectionAnchorNav activeSection={null} />)
    const links = container.querySelectorAll('a[href^="#section-"]')
    expect(links.length).toBe(18)
    expect(links[0].getAttribute('href')).toBe('#section-year-in-review')
  })

  it('marks the active section with aria-current="true"', () => {
    const { container } = renderWithIntl(<SectionAnchorNav activeSection="heatmap" />)
    const active = container.querySelector('a[aria-current="true"]') as HTMLAnchorElement
    expect(active.getAttribute('href')).toBe('#section-heatmap')
  })

  it('uses a <nav> landmark with localized aria-label', () => {
    const { container } = renderWithIntl(<SectionAnchorNav activeSection={null} />)
    const nav = container.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('Dashboard sections')
  })
})

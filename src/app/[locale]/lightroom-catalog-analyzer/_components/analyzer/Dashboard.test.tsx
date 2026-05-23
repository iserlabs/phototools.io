import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { Dashboard } from './Dashboard'
import { ALL_SECTION_IDS, anchorIdFor } from '../nav/sections'

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('Dashboard', () => {
  it('renders an anchor element for every section ID in canonical order', () => {
    const { container } = renderWithIntl(<Dashboard />)
    const anchors = container.querySelectorAll('section[id^="section-"]')
    expect(anchors.length).toBe(ALL_SECTION_IDS.length)
    ALL_SECTION_IDS.forEach((id, i) => {
      expect(anchors[i].getAttribute('id')).toBe(anchorIdFor(id))
    })
  })

  it('each section anchor has a min-height to support deterministic anchor scrolling', () => {
    const { container } = renderWithIntl(<Dashboard />)
    const first = container.querySelector('section[id^="section-"]') as HTMLElement
    // Style is set inline; jsdom returns the literal value.
    expect(first.style.minHeight).not.toBe('')
  })

  it('renders the local-only footer note', () => {
    const { getByText } = renderWithIntl(<Dashboard />)
    expect(getByText(/Computed in your browser/i)).toBeInTheDocument()
  })
})

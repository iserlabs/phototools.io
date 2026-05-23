import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { MobileSectionDropdown } from './MobileSectionDropdown'

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('MobileSectionDropdown', () => {
  it('renders a <details> with the "Jump to section" summary', () => {
    const { container } = renderWithIntl(<MobileSectionDropdown />)
    const details = container.querySelector('details')
    expect(details).toBeTruthy()
    expect(screen.getByText(/Jump to section/i)).toBeInTheDocument()
  })

  it('lists all 18 sections inside the dropdown', () => {
    const { container } = renderWithIntl(<MobileSectionDropdown />)
    const links = container.querySelectorAll('a[href^="#section-"]')
    expect(links.length).toBe(18)
  })
})

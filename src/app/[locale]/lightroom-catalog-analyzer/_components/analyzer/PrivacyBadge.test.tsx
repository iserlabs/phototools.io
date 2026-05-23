import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { PrivacyBadge } from './PrivacyBadge'

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('PrivacyBadge', () => {
  it('renders the "100% Local" label', () => {
    renderWithIntl(<PrivacyBadge />)
    expect(screen.getByText('100% Local · No Upload')).toBeInTheDocument()
  })

  it('uses a descriptive aria-label', () => {
    renderWithIntl(<PrivacyBadge />)
    const el = screen.getByLabelText(/Privacy guarantee/i)
    expect(el).toBeInTheDocument()
  })
})

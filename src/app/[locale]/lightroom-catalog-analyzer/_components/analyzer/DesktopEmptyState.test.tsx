import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { DesktopEmptyState } from './DesktopEmptyState'

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('DesktopEmptyState', () => {
  it('renders the headline, subhead, and the dashboard section preview', () => {
    renderWithIntl(<DesktopEmptyState />)
    expect(screen.getByText(/Analyze your Lightroom Classic catalog/i)).toBeInTheDocument()
    expect(screen.getByText(/entirely in your browser/i)).toBeInTheDocument()
    expect(screen.getByTestId('desktop-empty')).toBeInTheDocument()
  })

  it('does not render an uploader (that lives in the sidebar UploaderPanel)', () => {
    renderWithIntl(<DesktopEmptyState />)
    expect(screen.queryByLabelText(/catalog file picker/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Try the demo catalog/i)).not.toBeInTheDocument()
  })
})

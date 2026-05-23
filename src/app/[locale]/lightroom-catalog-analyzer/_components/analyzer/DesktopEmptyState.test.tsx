import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
  it('renders headline, explainer, FilePicker, PrivacyBadge, and demo button', () => {
    renderWithIntl(<DesktopEmptyState onFile={() => {}} onDemo={() => {}} />)
    expect(screen.getByText(/Analyze your Lightroom Classic catalog/i)).toBeInTheDocument()
    expect(screen.getByText(/Pick a \.lrcat file/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/catalog file picker/i)).toBeInTheDocument()
    expect(screen.getByText(/100% Local · No Upload/i)).toBeInTheDocument()
    expect(screen.getByText(/Try the demo catalog/i)).toBeInTheDocument()
  })

  it('invokes onDemo when the demo button is clicked', () => {
    const onDemo = vi.fn()
    renderWithIntl(<DesktopEmptyState onFile={() => {}} onDemo={onDemo} />)
    fireEvent.click(screen.getByText(/Try the demo catalog/i))
    expect(onDemo).toHaveBeenCalledOnce()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { UploaderPanel } from './UploaderPanel'

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('UploaderPanel', () => {
  it('renders the FilePicker, PrivacyBadge, and demo button', () => {
    renderWithIntl(<UploaderPanel onFile={() => {}} onDemo={() => {}} />)
    expect(screen.getByLabelText(/catalog file picker/i)).toBeInTheDocument()
    expect(screen.getByText(/100% Local · No Upload/i)).toBeInTheDocument()
    expect(screen.getByText(/Try the demo catalog/i)).toBeInTheDocument()
  })

  it('invokes onDemo when the demo button is clicked', () => {
    const onDemo = vi.fn()
    renderWithIntl(<UploaderPanel onFile={() => {}} onDemo={onDemo} />)
    fireEvent.click(screen.getByText(/Try the demo catalog/i))
    expect(onDemo).toHaveBeenCalledOnce()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { MobileSplash } from './MobileSplash'

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('MobileSplash', () => {
  it('renders the headline, body, and 3 screenshot slots', () => {
    renderWithIntl(<MobileSplash onDemo={() => {}} />)
    expect(screen.getByText(/This one needs a desktop/i)).toBeInTheDocument()
    expect(screen.getByText(/needs your Lightroom Classic catalog/i)).toBeInTheDocument()
    expect(screen.getAllByAltText(/dashboard preview/i).length).toBe(3)
  })

  it('invokes onDemo when "Try the demo here" is clicked', () => {
    const onDemo = vi.fn()
    renderWithIntl(<MobileSplash onDemo={onDemo} />)
    fireEvent.click(screen.getByText(/Try the demo here/i))
    expect(onDemo).toHaveBeenCalledOnce()
  })

  it('copies the current URL when the copy-link button is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderWithIntl(<MobileSplash onDemo={() => {}} />)
    fireEvent.click(screen.getByText(/^Copy link$/))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
  })
})

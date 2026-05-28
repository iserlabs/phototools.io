import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { ErrorScreen } from './ErrorScreen'

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('ErrorScreen', () => {
  it('renders the localized message for a known error kind', () => {
    renderWithIntl(<ErrorScreen errorKind="schemaTooNew" onRetry={() => {}} />)
    // The schemaTooNew message text should appear
    const expected = enMessages.toolUI['lightroom-catalog-analyzer'].errors.schemaTooNew
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('falls back to "unknown" copy when errorKind is null', () => {
    renderWithIntl(<ErrorScreen errorKind={null} onRetry={() => {}} />)
    const expected = enMessages.toolUI['lightroom-catalog-analyzer'].errors.unknown
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('falls back to "unknown" copy for an unrecognized errorKind', () => {
    renderWithIntl(<ErrorScreen errorKind="madeUpError" onRetry={() => {}} />)
    const expected = enMessages.toolUI['lightroom-catalog-analyzer'].errors.unknown
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('calls onRetry when the retry button is clicked', () => {
    const onRetry = vi.fn()
    renderWithIntl(<ErrorScreen errorKind="parseFailed" onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: /try another catalog/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('places role="alert" on the message paragraph (not the wrapping section)', () => {
    renderWithIntl(<ErrorScreen errorKind="corrupt" onRetry={() => {}} />)
    const alert = screen.getByRole('alert')
    expect(alert.tagName).toBe('P')
  })
})

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { ShareDisclosureModal } from './ShareDisclosureModal'
import type { InsightBlob } from '@/lib/lrcat/types'

vi.mock('./share-client', () => ({
  createShare: vi.fn(async () => ({ id: 'abcd1234abcd1234', url: 'https://x/r/abcd1234abcd1234', expiresAt: '2099-01-01T00:00:00.000Z' })),
  ShareError: class extends Error {},
}))
import { createShare } from './share-client'

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={enMessages}>{ui}</NextIntlClientProvider>
}
const blob = { meta: { schemaVersion: 1 } } as unknown as InsightBlob

beforeEach(() => vi.clearAllMocks())

describe('ShareDisclosureModal', () => {
  it('renders the disclosure copy and a default 30d selection', () => {
    render(wrap(<ShareDisclosureModal blob={blob} onClose={() => {}} onCreated={() => {}} />))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // "30d" radio is checked by default
    const thirty = screen.getByRole('radio', { name: /30 days/i }) as HTMLInputElement
    expect(thirty.checked).toBe(true)
  })

  it('creates a share with the chosen expiration', async () => {
    const onCreated = vi.fn()
    render(wrap(<ShareDisclosureModal blob={blob} onClose={() => {}} onCreated={onCreated} />))
    fireEvent.click(screen.getByRole('radio', { name: /24 hours/i }))
    fireEvent.click(screen.getByRole('button', { name: /create link/i }))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(createShare).toHaveBeenCalledWith(blob, '24h')
  })

  it('calls onClose on Cancel', () => {
    const onClose = vi.fn()
    render(wrap(<ShareDisclosureModal blob={blob} onClose={onClose} onCreated={() => {}} />))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})

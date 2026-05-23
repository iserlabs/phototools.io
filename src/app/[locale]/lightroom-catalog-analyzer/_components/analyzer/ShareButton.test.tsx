import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { ShareButton } from './ShareButton'
import type { InsightBlob } from '@/lib/lrcat/types'

vi.mock('@/lib/lrcat/share-storage', () => ({ appendShare: vi.fn() }))
import { appendShare } from '@/lib/lrcat/share-storage'

const blob = { meta: { schemaVersion: 1 } } as unknown as InsightBlob
function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={enMessages}>{ui}</NextIntlClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('ShareButton', () => {
  it('renders the share button and opens the modal on click', () => {
    render(wrap(<ShareButton blob={blob} />))
    const btn = screen.getByRole('button', { name: /share via url/i })
    fireEvent.click(btn)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('persists the share to localStorage on success', async () => {
    render(wrap(<ShareButton blob={blob} onCreatedForTest={{ id: 'abcd1234abcd1234', url: 'https://x', expiresAt: '2099-01-01T00:00:00.000Z' }} />))
    await waitFor(() => expect(appendShare).toHaveBeenCalled())
  })
})

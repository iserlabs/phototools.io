import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { ShareSuccessPanel } from './ShareSuccessPanel'

vi.mock('./share-client', () => ({ deleteShare: vi.fn(async () => undefined) }))
vi.mock('@/lib/lrcat/share-storage', () => ({ removeShare: vi.fn() }))
vi.mock('sonner', () => ({ toast: vi.fn() }))

import { deleteShare } from './share-client'
import { removeShare } from '@/lib/lrcat/share-storage'

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={enMessages}>{ui}</NextIntlClientProvider>
}
const result = { id: 'abcd1234abcd1234', url: 'https://www.phototools.io/en/lightroom-catalog-analyzer/r/abcd1234abcd1234', expiresAt: '2099-01-01T00:00:00.000Z' }

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => {}) } })
})

describe('ShareSuccessPanel', () => {
  it('shows the URL and expiration date', () => {
    render(wrap(<ShareSuccessPanel result={result} onDeleted={() => {}} />))
    expect(screen.getByDisplayValue(result.url)).toBeInTheDocument()
  })

  it('copies the URL on Copy click', async () => {
    render(wrap(<ShareSuccessPanel result={result} onDeleted={() => {}} />))
    fireEvent.click(screen.getByRole('button', { name: /copy/i }))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(result.url))
  })

  it('deletes the share and notifies parent', async () => {
    const onDeleted = vi.fn()
    render(wrap(<ShareSuccessPanel result={result} onDeleted={onDeleted} />))
    fireEvent.click(screen.getByRole('button', { name: /delete this share/i }))
    await waitFor(() => expect(deleteShare).toHaveBeenCalledWith(result.id))
    expect(removeShare).toHaveBeenCalledWith(result.id)
    expect(onDeleted).toHaveBeenCalled()
  })
})

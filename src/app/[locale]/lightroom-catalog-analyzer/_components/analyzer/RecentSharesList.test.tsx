import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { RecentSharesList } from './RecentSharesList'

const active = [
  { id: 'abcd1234abcdWXYZ', url: 'https://x/r/abcd1234abcdWXYZ', createdAt: Date.now() - 1000, expiresAt: Date.now() + 1e7, filterContext: { cameras: ['Sony A7R V'] } },
]
vi.mock('@/lib/lrcat/share-storage', () => ({
  listActiveShares: vi.fn(() => active),
  removeShare: vi.fn(),
  summarizeFilter: vi.fn(() => 'cameras Sony A7R V'),
}))
vi.mock('./share-client', () => ({ deleteShare: vi.fn(async () => undefined) }))
import { listActiveShares, removeShare } from '@/lib/lrcat/share-storage'
import { deleteShare } from './share-client'

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={enMessages}>{ui}</NextIntlClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('RecentSharesList', () => {
  it('renders one row per active share, showing the last 4 id chars', () => {
    render(wrap(<RecentSharesList />))
    expect(screen.getByText(/WXYZ/)).toBeInTheDocument()
  })

  it('renders nothing when there are no active shares', () => {
    ;(listActiveShares as ReturnType<typeof vi.fn>).mockReturnValueOnce([])
    const { container } = render(wrap(<RecentSharesList />))
    expect(container).toBeEmptyDOMElement()
  })

  it('deletes a share on Delete click', async () => {
    render(wrap(<RecentSharesList />))
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => expect(deleteShare).toHaveBeenCalledWith('abcd1234abcdWXYZ'))
    expect(removeShare).toHaveBeenCalledWith('abcd1234abcdWXYZ')
  })
})

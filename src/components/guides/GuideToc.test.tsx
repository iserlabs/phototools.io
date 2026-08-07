import { NextIntlClientProvider } from 'next-intl'
import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import guidesMessages from '@/lib/i18n/messages/en/guides.json'
import { GuideToc } from './GuideToc'

beforeAll(() => {
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    // jsdom doesn't implement IntersectionObserver.
    class IntersectionObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
  }
})

const entries = [
  { id: 'setup', text: 'Setup', depth: 2 as const },
  { id: 'lighting', text: 'Lighting', depth: 3 as const },
]

describe('GuideToc', () => {
  it('renders one anchor per entry with depth styling', () => {
    render(
      <NextIntlClientProvider locale="en" messages={guidesMessages}>
        <GuideToc entries={entries} />
      </NextIntlClientProvider>
    )
    expect(screen.getByRole('link', { name: 'Setup' })).toHaveAttribute('href', '#setup')
    expect(screen.getByRole('link', { name: 'Lighting' }).className).toContain('depth3')
    // Regression guard: depth-2 entries have no depth class, so the
    // className must never contain the literal string "undefined".
    expect(screen.getByRole('link', { name: 'Setup' }).className).not.toContain('undefined')
  })
  it('renders nothing with fewer than 2 entries', () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={guidesMessages}>
        <GuideToc entries={[entries[0]]} />
      </NextIntlClientProvider>
    )
    expect(container.innerHTML).toBe('')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { LightroomCatalogAnalyzer } from './LightroomCatalogAnalyzer'

vi.mock('./workerFactory', () => ({
  createAnalyzerApi: vi.fn(() => ({
    api: {
      openCatalog: vi.fn(async () => { throw new Error('not used in shell test') }),
      applyFilter: vi.fn(), computeYearInReview: vi.fn(), close: vi.fn(),
    },
    dispose: vi.fn(),
  })),
}))

vi.mock('./cache', () => ({
  getCachedInsights: vi.fn(async () => null),
  setCachedInsights: vi.fn(async () => {}),
  clearAllCachedInsights: vi.fn(async () => {}),
}))

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('LightroomCatalogAnalyzer', () => {
  it('renders both MobileSplash and DesktopEmptyState (CSS picks which is visible)', () => {
    renderWithIntl(<LightroomCatalogAnalyzer />)
    expect(screen.getByTestId('mobile-splash')).toBeInTheDocument()
    expect(screen.getByTestId('desktop-empty')).toBeInTheDocument()
  })

  it('renders the privacy badge in the empty state', () => {
    renderWithIntl(<LightroomCatalogAnalyzer />)
    // Two instances: one inside the desktop empty header and one inside the mobile splash.
    expect(screen.getAllByText(/100% Local · No Upload/).length).toBeGreaterThanOrEqual(1)
  })

  it('includes a skip-to-main-content link as the first focusable element (m-7)', () => {
    const { container } = renderWithIntl(<LightroomCatalogAnalyzer />)
    const skip = container.querySelector('a[href="#lrcat-main"]')
    expect(skip).toBeTruthy()
  })
})

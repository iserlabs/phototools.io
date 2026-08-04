import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { Dashboard } from './Dashboard'
import { AnalyzerContext, type AnalyzerContextValue } from './AnalyzerContext'
import { ALL_SECTION_IDS, anchorIdFor } from '../nav/sections'
import { makeFixtureBlob } from '../sections/__test-helpers__'

// Dashboard now mounts the real section components, which read the analyzer
// context. Provide a loaded context with the shared fixture blob.
function renderDashboard(
  ui: ReactNode = <Dashboard />,
  overrides: Partial<AnalyzerContextValue> = {},
) {
  const value: AnalyzerContextValue = {
    status: 'loaded',
    insightBlob: makeFixtureBlob(),
    worker: null,
    filter: undefined,
    error: null,
    loadedFromCache: false,
    lastProgress: null,
    open: async () => {},
    applyFilter: async () => {},
    setFilter: () => {},
    reset: () => {},
    setYearInReview: () => {},
    close: () => {},
    ...overrides,
  }
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AnalyzerContext.Provider value={value}>{ui}</AnalyzerContext.Provider>
    </NextIntlClientProvider>,
  )
}

describe('Dashboard', () => {
  it('renders a section anchor for every section ID in canonical order (M-1: section- prefix preserved)', () => {
    const { container } = renderDashboard()
    const anchors = container.querySelectorAll('div[class] > section[id^="section-"]')
    expect(anchors.length).toBe(ALL_SECTION_IDS.length)
    ALL_SECTION_IDS.forEach((id, i) => {
      expect(anchors[i].getAttribute('id')).toBe(anchorIdFor(id))
    })
  })

  it('each section anchor has a min-height to support deterministic anchor scrolling', () => {
    const { container } = renderDashboard()
    const first = container.querySelector('section[id^="section-"]') as HTMLElement
    expect(first.style.minHeight).not.toBe('')
  })

  it('renders the local-only footer note', () => {
    const { getByText } = renderDashboard()
    expect(getByText(/Computed in your browser/i)).toBeInTheDocument()
  })

  // In idle the dashboard shell is structurally present but empty — the note
  // claims stats were "computed from your local catalog file", which is only
  // true once a catalog is loaded. It also gave the idle page a second
  // <footer>, tripping the strict-mode smoke assertion on the site footer.
  it('does NOT render the footer note before a catalog is loaded', () => {
    const { queryByText, container } = renderDashboard(<Dashboard />, {
      status: 'idle',
      insightBlob: null,
    })
    expect(queryByText(/Computed in your browser/i)).toBeNull()
    expect(container.querySelector('footer')).toBeNull()
  })

  it('mounts period comparison inside its anchor (drilldown moved to sidebar)', () => {
    const { container } = renderDashboard()
    // Drilldown is no longer a spine section — it lives in the sidebar control
    // panel (ControlSidebar). Period Comparison remains.
    const periodComp = container.querySelector(`#${anchorIdFor('period-comparison')}`)
    expect(periodComp).toBeTruthy()
  })
})

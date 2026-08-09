import { render, screen, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, it, expect, vi } from 'vitest'
import type { ReactElement } from 'react'
import enMessages from '@/lib/i18n/messages/en/tools/focus-stacking-calculator.json'
import { ShotTable } from './ShotTable'

// Matches the mocking convention in lightroom-catalog-analyzer's Dashboard.test.tsx:
// real English messages through NextIntlClientProvider rather than a hand-rolled mock.
function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

// Reference kept outside the `as never` cast so assertions on it (below)
// aren't typed as `never` themselves — the cast only needs to widen the
// object literal enough to satisfy the `state` prop's StackingState shape.
const setHoveredShot = vi.fn()
const distanceState = {
  mode: 'distance',
  stackingResult: { shots: [
    { number: 1, focusDistance: 0.52, nearFocus: 0.5, farFocus: 0.55 },
    { number: 2, focusDistance: 0.57, nearFocus: 0.54, farFocus: 0.61 },
  ], totalDepth: 4.5, coverageComplete: true },
  macroRows: [],
  hoveredShot: null,
  setHoveredShot,
} as never

const macroState = {
  mode: 'macro',
  stackingResult: { shots: [], totalDepth: 0, coverageComplete: true },
  macroRows: [
    { number: 1, railPositionMm: 0, sliceStartMm: 0, sliceEndMm: 0.2 },
    { number: 2, railPositionMm: 0.15, sliceStartMm: 0.15, sliceEndMm: 0.35 },
  ],
  macroResult: { stepMm: 0.15 },
  hoveredShot: null,
  setHoveredShot: vi.fn(),
} as never

describe('ShotTable', () => {
  it('renders one row per shot with focus distance and step', () => {
    renderWithIntl(<ShotTable state={distanceState} playing={false} />)
    expect(screen.getAllByRole('row')).toHaveLength(3) // header + 2
    expect(screen.getByText('52 cm')).toBeInTheDocument()
  })
  it('reports hover index', () => {
    renderWithIntl(<ShotTable state={distanceState} playing={false} />)
    fireEvent.mouseEnter(screen.getAllByRole('row')[1])
    expect(setHoveredShot).toHaveBeenCalledWith(0)
  })
  // Distance mode renders 5 columns (shot, focus, near, far, step) via
  // isDistance-guarded <thead> cells; macro mode renders 3 (shot, rail
  // position, step). Header cell count must match body cell count in BOTH
  // modes or the table is malformed — this pins that invariant for macro.
  it('macro mode header cell count matches body row cell count', () => {
    const { container } = renderWithIntl(<ShotTable state={macroState} playing={false} />)
    const headerCells = container.querySelectorAll('thead tr th').length
    const firstBodyRowCells = container.querySelectorAll('tbody tr')[0].querySelectorAll('td').length
    expect(headerCells).toBe(3)
    expect(firstBodyRowCells).toBe(3)
    expect(headerCells).toBe(firstBodyRowCells)
  })
})

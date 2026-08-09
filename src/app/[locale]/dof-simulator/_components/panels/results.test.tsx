import type { ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

// next-intl's navigation factory (createNavigation) imports `next/navigation`,
// which vitest/Vite can't resolve outside a real Next.js build (see
// JsonLd.test.tsx for the same precedent) — stub it with a plain anchor so
// ResultsPanelConnected's `Link` cross-link renders without a real router.
vi.mock('@/lib/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}))

import { ResultsPanel } from './ResultsPanel'
import { ResultsPanelConnected } from './ResultsPanelConnected'
import { SavedSettingsPanel } from './SavedSettingsPanel'
import { SavedSettingsPanelConnected } from './SavedSettingsPanelConnected'
import { computeDerived } from '../state/useDofDerived'
import { getSubjectById } from '@/lib/data/dofSimulator/models'
import { getBackgroundById } from '@/lib/data/dofSimulator/backgrounds'
import esMessages from '@/lib/i18n/messages/es/tools/dof-simulator.json'
import type { OpticsState } from '../state/useOptics'
import type { SavedSettingsApi } from '../state/useSavedSettings'

function derivedFor(sensorId: string, overrides: Partial<OpticsState> = {}) {
  return computeDerived({
    optics: {
      focalLength: 85, aperture: 2.8, distanceM: 3, sensorId, cameraId: null, lensId: null,
      teleconverterId: 'none', customCocMm: null, backgroundDistanceM: null,
      ...overrides,
    },
    subject: getSubjectById('woman-a'), background: getBackgroundById('city-skyline'),
    orientation: 'landscape', bokeh: 'disc',
  })
}

describe('ResultsPanel', () => {
  it('shows the equivalence line on crop sensors and hides it on FF', () => {
    const crop = render(<ResultsPanel derived={derivedFor('apsc_n')} imperial={false} bokeh="disc" />)
    expect(crop.container.textContent).toMatch(/equivalent/i)
    const ff = render(<ResultsPanel derived={derivedFor('ff')} imperial={false} bokeh="disc" />)
    expect(ff.container.textContent).not.toMatch(/equivalent/i)
  })
  it('always renders hyperfocal distance', () => {
    const { container } = render(<ResultsPanel derived={derivedFor('ff')} imperial={false} bokeh="disc" />)
    expect(container.textContent).toMatch(/hyperfocal/i)
  })
  it('shows the effective focal length only when a teleconverter is active', () => {
    const off = render(<ResultsPanel derived={derivedFor('ff')} imperial={false} bokeh="disc" />)
    expect(off.container.textContent).not.toMatch(/effective focal length/i)
    const on = render(
      <ResultsPanel derived={derivedFor('ff', { teleconverterId: 'tc20' })} imperial={false} bokeh="disc" />,
    )
    expect(on.container.textContent).toMatch(/effective focal length/i)
  })
  it('shows the full-frame-equivalent focal length only for phone-sized sensors', () => {
    const ff = render(<ResultsPanel derived={derivedFor('ff')} imperial={false} bokeh="disc" />)
    expect(ff.container.textContent).not.toMatch(/35mm equivalent/i)
    const phone = render(<ResultsPanel derived={derivedFor('iphone16pro')} imperial={false} bokeh="disc" />)
    expect(phone.container.textContent).toMatch(/35mm equivalent/i)
  })
  it('shows a diffraction warning chip when isDiffractionLimited', () => {
    // calcAiryDisk(32) = 2.44 * 0.00055mm * 32 ≈ 0.043mm, which exceeds the
    // FF sensor's default CoC (0.03mm) — see calcAiryDisk in lib/math/dof.ts.
    const derived = derivedFor('ff', { aperture: 32 })
    expect(derived.isDiffractionLimited).toBe(true)
    const { container } = render(<ResultsPanel derived={derived} imperial={false} bokeh="disc" />)
    expect(container.textContent).toMatch(/diffraction/i)
  })
  it('shows an MFD warning chip when focused closer than the lens minimum', () => {
    const derived = derivedFor('ff', { lensId: 'nikkor-z-85mm-f1-8-s', distanceM: 0.3 })
    expect(derived.belowMinFocus).toBe(true)
    const { container } = render(<ResultsPanel derived={derived} imperial={false} bokeh="disc" />)
    expect(container.textContent).toMatch(/minimum focus/i)
  })
  it('does not render warning chips when nothing is out of range', () => {
    const { container } = render(<ResultsPanel derived={derivedFor('ff')} imperial={false} bokeh="disc" />)
    expect(container.textContent).not.toMatch(/diffraction/i)
    expect(container.textContent).not.toMatch(/minimum focus/i)
  })
  it('renders a non-zero, meaningful CoC value instead of rounding it away to "0mm"', () => {
    // FF's default CoC is 0.03/1 = 0.03mm — a whole-mm formatter rounds this
    // (and every other reachable CoC, down to the 0.0081mm phone-sensor floor)
    // to "0mm". A sub-mm-aware formatter must show real digits instead.
    const { getByText } = render(<ResultsPanel derived={derivedFor('ff')} imperial={false} bokeh="disc" />)
    const cocRow = getByText('Circle of Confusion').closest('div')
    expect(cocRow?.textContent).not.toMatch(/\b0mm\b/)
    expect(cocRow?.textContent).toMatch(/0\.\d+mm/)
  })
  it('renders a non-zero background-blur mm value alongside its percentage', () => {
    // A wide, stopped-down setup keeps blur sub-mm while the % figure is
    // clearly non-zero — the same whole-mm rounding bug printed "0mm (0.5%)".
    const derived = derivedFor('ff', { focalLength: 8, aperture: 8 })
    const { getByText } = render(<ResultsPanel derived={derived} imperial={false} bokeh="disc" />)
    const blurRow = getByText('Background Blur').closest('div')
    expect(blurRow?.textContent).not.toMatch(/\b0mm\b/)
    expect(blurRow?.textContent).toMatch(/0\.\d+mm/)
  })
})

describe('SavedSettingsPanel', () => {
  const row = { id: 'r1', cameraLabel: 'Full Frame', focalLength: 85, aperture: 1.4, distanceM: 3, bokeh: 'disc' as const }
  const saved = { rows: [row], addRow: vi.fn(), removeRow: vi.fn(), sortBy: vi.fn() }
  it('applies a row on click and saves the current setup', () => {
    const onApply = vi.fn()
    const { getByText } = render(
      <SavedSettingsPanel saved={saved} onApply={onApply}
        current={{ cameraLabel: 'Full Frame', focalLength: 50, aperture: 2, distanceM: 2, bokeh: 'disc' }} />,
    )
    fireEvent.click(getByText('Full Frame'))
    expect(onApply).toHaveBeenCalledWith(row)
    fireEvent.click(getByText(/save settings/i))
    expect(saved.addRow).toHaveBeenCalled()
  })

  it('sorts by a clicked column header and marks it aria-sort=ascending', () => {
    const sortBy = vi.fn()
    const { getByRole } = render(
      <SavedSettingsPanel
        saved={{ rows: [row], addRow: vi.fn(), removeRow: vi.fn(), sortBy }}
        onApply={vi.fn()}
        current={{ cameraLabel: 'Full Frame', focalLength: 50, aperture: 2, distanceM: 2, bokeh: 'disc' }}
      />,
    )
    fireEvent.click(getByRole('button', { name: 'Focal Length' }))
    expect(sortBy).toHaveBeenCalledWith('focalLength')
    const th = getByRole('columnheader', { name: 'Focal Length' })
    expect(th).toHaveAttribute('aria-sort', 'ascending')
  })

  it('removing a row calls removeRow without triggering onApply', () => {
    const onApply = vi.fn()
    const removeRow = vi.fn()
    const { getByRole } = render(
      <SavedSettingsPanel
        saved={{ rows: [row], addRow: vi.fn(), removeRow, sortBy: vi.fn() }}
        onApply={onApply}
        current={{ cameraLabel: 'Full Frame', focalLength: 50, aperture: 2, distanceM: 2, bokeh: 'disc' }}
      />,
    )
    fireEvent.click(getByRole('button', { name: /remove/i }))
    expect(removeRow).toHaveBeenCalledWith('r1')
    expect(onApply).not.toHaveBeenCalled()
  })

  it('shows an empty-state message when there are no saved rows', () => {
    const empty: SavedSettingsApi = { rows: [], addRow: vi.fn(), removeRow: vi.fn(), sortBy: vi.fn() }
    const { getByText } = render(
      <SavedSettingsPanel saved={empty} onApply={vi.fn()}
        current={{ cameraLabel: 'Full Frame', focalLength: 50, aperture: 2, distanceM: 2, bokeh: 'disc' }} />,
    )
    expect(getByText(/no saved settings/i)).toBeInTheDocument()
  })
})

// ── *Connected wrappers: prove translations actually flow through ──
// Rendered inside a NextIntlClientProvider with the ES locale (not EN) so a
// passing assertion means real translation occurred — see controls.test.tsx.

const esT = esMessages.toolUI['dof-simulator']

function renderWithEs(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('ResultsPanelConnected', () => {
  it('renders real ES translations, including the equivalent-settings cross-link', () => {
    const { getByText, getByRole } = renderWithEs(
      <ResultsPanelConnected derived={derivedFor('apsc_n')} imperial={false} bokeh="disc" />,
    )
    expect(getByText(esT.hyperfocal)).toBeInTheDocument()
    expect(getByText(esT.equivalentSettings)).toBeInTheDocument()
    const link = getByRole('link')
    expect(link).toHaveAttribute('href', '/equivalent-settings-calculator')
  })
})

describe('SavedSettingsPanelConnected', () => {
  const row = { id: 'r1', cameraLabel: 'Full Frame', focalLength: 85, aperture: 1.4, distanceM: 3, bokeh: 'disc' as const }
  it('renders real ES translations for the table headers and save button', () => {
    const saved: SavedSettingsApi = { rows: [row], addRow: vi.fn(), removeRow: vi.fn(), sortBy: vi.fn() }
    const { getByText } = renderWithEs(
      <SavedSettingsPanelConnected saved={saved} onApply={vi.fn()}
        current={{ cameraLabel: 'Full Frame', focalLength: 50, aperture: 2, distanceM: 2, bokeh: 'disc' }} />,
    )
    expect(getByText(esT.savedSettings)).toBeInTheDocument()
    expect(getByText(esT.saveSettings)).toBeInTheDocument()
    expect(getByText(esT.focalLength)).toBeInTheDocument()
  })
})

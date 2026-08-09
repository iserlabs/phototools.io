import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { SearchCombobox } from './SearchCombobox'
import { FramingPanel } from './FramingPanel'
import { FramingPanelConnected } from './FramingPanelConnected'
import { CameraPanelConnected } from './CameraPanelConnected'
import { LensPanel } from './LensPanel'
import { LensPanelConnected } from './LensPanelConnected'
import { DistancePanelConnected } from './DistancePanelConnected'
import { AdvancedPanelConnected } from './AdvancedPanelConnected'
import { computeDerived } from '../state/useDofDerived'
import { DOF_CAMERAS } from '@/lib/data/dofSimulator/cameras'
import { DOF_SUBJECTS } from '@/lib/data/dofSimulator/models'
import { DOF_BACKGROUNDS } from '@/lib/data/dofSimulator/backgrounds'
import type { DofCamera } from '@/lib/data/dofSimulator/types'
import type { OpticsApi, OpticsState } from '../state/useOptics'
import { formatDistance } from '../state/formatters'
import esMessages from '@/lib/i18n/messages/es/tools/dof-simulator.json'

const comboProps = {
  items: DOF_CAMERAS,
  groupBy: (c: DofCamera) => c.brand,
  label: (c: DofCamera) => `${c.brand} ${c.model}`,
  value: null, onChange: vi.fn(), placeholder: 'Search cameras', clearLabel: 'Clear',
}

describe('SearchCombobox', () => {
  it('filters options by query', () => {
    const { getByRole, queryByText } = render(<SearchCombobox {...comboProps} />)
    fireEvent.change(getByRole('combobox'), { target: { value: 'z8' } })
    expect(queryByText(/Nikon Z8/)).not.toBeNull()
    expect(queryByText(/Sony/)).toBeNull()
  })
  it('selects on click and clears to null', () => {
    const onChange = vi.fn()
    const { getByRole, getByText } = render(<SearchCombobox {...comboProps} onChange={onChange} />)
    fireEvent.change(getByRole('combobox'), { target: { value: 'z8' } })
    fireEvent.click(getByText(/Nikon Z8/))
    expect(onChange).toHaveBeenCalledWith('nikon-z8')
    const cleared = render(<SearchCombobox {...comboProps} value="nikon-z8" onChange={onChange} />)
    fireEvent.click(cleared.getByText('Clear'))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})

describe('FramingPanel', () => {
  it('fires onPreset with the preset key', () => {
    const onPreset = vi.fn()
    const framing = {
      activePreset: null, lockFov: false, lockedFrameHeightMm: null,
      setActivePreset: vi.fn(), setLockFov: vi.fn(), setLockedFrameHeightMm: vi.fn(),
    }
    const { getAllByRole } = render(<FramingPanel framing={framing} onPreset={onPreset} />)
    fireEvent.click(getAllByRole('button')[0])
    expect(onPreset).toHaveBeenCalledWith('face')
  })
})

describe('formatDistance', () => {
  it('uses cm under a meter, m above, ft/in for imperial', () => {
    expect(formatDistance(0.85, false)).toBe('85 cm')
    expect(formatDistance(2.4, false)).toBe('2.4 m')
    expect(formatDistance(2.4, true)).toBe('7 ft 10 in')
  })
})

// ── *Connected wrappers: prove translations actually flow through ──
//
// Rendered inside a NextIntlClientProvider with the ES locale (not EN) so a
// passing assertion means real translation occurred, not just that the
// English default happened to match — see AppearancePanelConnected's
// regression test (Task 19) for the established precedent.

const esT = esMessages.toolUI['dof-simulator']

function makeOptics(overrides: Partial<OpticsState> = {}): OpticsApi {
  const state: OpticsState = {
    focalLength: 85, aperture: 2.8, distanceM: 3, sensorId: 'ff',
    cameraId: null, lensId: null, teleconverterId: 'none',
    customCocMm: null, backgroundDistanceM: null,
    ...overrides,
  }
  return {
    ...state,
    setFocalLength: vi.fn(), setAperture: vi.fn(), setDistanceM: vi.fn(),
    setSensorId: vi.fn(), setCameraId: vi.fn(), setLensId: vi.fn(),
    setTeleconverterId: vi.fn(), setCustomCocMm: vi.fn(), setBackgroundDistanceM: vi.fn(),
  }
}

function makeDerived(optics: OpticsApi) {
  return computeDerived({
    optics, subject: DOF_SUBJECTS[0], background: DOF_BACKGROUNDS[0],
    orientation: 'landscape', bokeh: 'disc',
  })
}

function makeUiPrefs(overrides: { advanced?: boolean; imperial?: boolean } = {}) {
  return {
    advanced: false, imperial: false, ...overrides,
    setAdvanced: vi.fn(), setImperial: vi.fn(),
  }
}

function renderWithEs(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('CameraPanelConnected', () => {
  it('renders real ES translations, not the English-literal defaults', () => {
    const optics = makeOptics()
    const { getAllByText, getByText } = renderWithEs(
      <CameraPanelConnected optics={optics} derived={makeDerived(optics)} />,
    )
    // "Cámara" appears twice by design (panel title + ModeToggle option).
    expect(getAllByText(esT.camera).length).toBeGreaterThanOrEqual(2)
    expect(getByText(esT.sensor)).toBeInTheDocument() // "Sensor" (ModeToggle option)
    expect(getByText(esT.cropFactor)).toBeInTheDocument() // "Factor de recorte"
  })
})

describe('LensPanelConnected', () => {
  it('renders real ES translations, including the advanced-only teleconverter select', () => {
    const optics = makeOptics()
    const uiPrefs = makeUiPrefs({ advanced: true })
    const { getByText } = renderWithEs(
      <LensPanelConnected optics={optics} derived={makeDerived(optics)} uiPrefs={uiPrefs} onFocalLengthChange={vi.fn()} />,
    )
    expect(getByText(esT.lens)).toBeInTheDocument() // "Objetivo"
    expect(getByText(esT.teleconverter)).toBeInTheDocument() // "Teleconversor"
  })
})

describe('LensPanel', () => {
  it('renders a valid (non-NaN) focal-length slider for a prime lens (flMin === flMax)', () => {
    // Canon RF 50mm F1.8 STM: flMin === flMax === 50 — see logSlider.test.ts
    // for the underlying divide-by-zero bug this guards against.
    const optics = makeOptics({ lensId: 'canon-rf-50mm-f1-8-stm', focalLength: 50 })
    const { getByLabelText } = render(
      <LensPanel optics={optics} derived={makeDerived(optics)} uiPrefs={makeUiPrefs()} onFocalLengthChange={vi.fn()} />,
    )
    const slider = getByLabelText(/Focal Length/) as HTMLInputElement
    expect(slider.value).not.toBe('NaN')
    expect(Number.isNaN(Number(slider.value))).toBe(false)
  })
})

describe('DistancePanelConnected', () => {
  it('renders the real ES minimum-focus warning with an interpolated, translated distance', () => {
    // Canon RF 85mm F1.2L (minFocusM: 0.85) focused closer than its MFD.
    const optics = makeOptics({ lensId: 'canon-rf-85mm-f1-2l-usm', focalLength: 85, distanceM: 0.5 })
    const uiPrefs = makeUiPrefs()
    const { getAllByText, getByText } = renderWithEs(
      <DistancePanelConnected optics={optics} derived={makeDerived(optics)} uiPrefs={uiPrefs} onDistanceChange={vi.fn()} />,
    )
    // "Distancia" appears twice by design (panel title + field label).
    expect(getAllByText(esT.distance).length).toBeGreaterThanOrEqual(2)
    expect(getByText('Por debajo de la distancia mínima de enfoque (85 cm)')).toBeInTheDocument()
  })
})

describe('FramingPanelConnected', () => {
  it('renders real ES translations for presets and the lock-FOV checkbox', () => {
    const framing = {
      activePreset: null, lockFov: false, lockedFrameHeightMm: null,
      setActivePreset: vi.fn(), setLockFov: vi.fn(), setLockedFrameHeightMm: vi.fn(),
    }
    const { getByText } = renderWithEs(<FramingPanelConnected framing={framing} onPreset={vi.fn()} />)
    expect(getByText(esT.framingPresetFace)).toBeInTheDocument() // "Rostro"
    expect(getByText(esT.lockFov)).toBeInTheDocument() // "Bloquear campo de visión"
  })
})

describe('AdvancedPanelConnected', () => {
  it('renders real ES translations when uiPrefs.advanced is on', () => {
    const optics = makeOptics()
    const uiPrefs = makeUiPrefs({ advanced: true })
    const { getByText } = renderWithEs(
      <AdvancedPanelConnected optics={optics} background={DOF_BACKGROUNDS[0]} uiPrefs={uiPrefs} />,
    )
    expect(getByText(esT.customCoc)).toBeInTheDocument() // "CoC personalizado"
    expect(getByText(esT.backgroundDistance)).toBeInTheDocument() // "Distancia del fondo"
  })
  it('renders nothing when uiPrefs.advanced is off', () => {
    const optics = makeOptics()
    const uiPrefs = makeUiPrefs({ advanced: false })
    const { container } = renderWithEs(
      <AdvancedPanelConnected optics={optics} background={DOF_BACKGROUNDS[0]} uiPrefs={uiPrefs} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

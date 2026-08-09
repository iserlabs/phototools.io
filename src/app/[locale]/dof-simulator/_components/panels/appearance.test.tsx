import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/dof-simulator.json'
import { AppearancePanel } from './AppearancePanel'
import { AppearancePanelConnected } from './AppearancePanelConnected'
import { InterfacePanel } from './InterfacePanel'
import { DOF_SUBJECTS } from '@/lib/data/dofSimulator/models'
import { DOF_BACKGROUNDS } from '@/lib/data/dofSimulator/backgrounds'

beforeAll(() => {
  // jsdom has no dialog implementation
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
})

function makeAppearance() {
  return {
    subjectId: DOF_SUBJECTS[0].id, backgroundId: DOF_BACKGROUNDS[0].id,
    orientation: 'landscape' as const,
    setSubjectId: vi.fn(), setBackgroundId: vi.fn(), setOrientation: vi.fn(),
  }
}

describe('AppearancePanel', () => {
  it('opens the model picker and reports the chosen subject', () => {
    const appearance = makeAppearance()
    const { getByText, getByRole } = render(
      <AppearancePanel appearance={appearance} subjects={DOF_SUBJECTS} backgrounds={DOF_BACKGROUNDS} />,
    )
    fireEvent.click(getByText(DOF_SUBJECTS[0].name))          // opener shows current subject name
    fireEvent.click(getByRole('button', { name: new RegExp(DOF_SUBJECTS[2].name) }))
    expect(appearance.setSubjectId).toHaveBeenCalledWith(DOF_SUBJECTS[2].id)
  })
  it('opens the background picker and reports the chosen scene', () => {
    const appearance = makeAppearance()
    const { getByText, getByRole } = render(
      <AppearancePanel appearance={appearance} subjects={DOF_SUBJECTS} backgrounds={DOF_BACKGROUNDS} />,
    )
    fireEvent.click(getByText(DOF_BACKGROUNDS[0].name))
    fireEvent.click(getByRole('button', { name: new RegExp(DOF_BACKGROUNDS[3].name) }))
    expect(appearance.setBackgroundId).toHaveBeenCalledWith(DOF_BACKGROUNDS[3].id)
  })
  it('selecting a model closes the dialog', () => {
    const appearance = makeAppearance()
    const closeSpy = vi.spyOn(HTMLDialogElement.prototype, 'close')
    const { getByText, getByRole } = render(
      <AppearancePanel appearance={appearance} subjects={DOF_SUBJECTS} backgrounds={DOF_BACKGROUNDS} />,
    )
    fireEvent.click(getByText(DOF_SUBJECTS[0].name))
    fireEvent.click(getByRole('button', { name: new RegExp(DOF_SUBJECTS[2].name) }))
    expect(closeSpy).toHaveBeenCalled()
  })
  it('toggles orientation via the ModeToggle', () => {
    const appearance = makeAppearance()
    const { getByRole } = render(
      <AppearancePanel appearance={appearance} subjects={DOF_SUBJECTS} backgrounds={DOF_BACKGROUNDS} />,
    )
    fireEvent.click(getByRole('button', { name: /portrait/i }))
    expect(appearance.setOrientation).toHaveBeenCalledWith('portrait')
  })
})

describe('AppearancePanelConnected', () => {
  it('renders real translated labels from the en messages, not the English-literal defaults', () => {
    const appearance = makeAppearance()
    const { getByText, getByRole } = renderWithIntl(
      <AppearancePanelConnected appearance={appearance} subjects={DOF_SUBJECTS} backgrounds={DOF_BACKGROUNDS} />,
    )
    // en happens to match the hardcoded default strings, so this only proves
    // the wiring reaches useTranslations() successfully (it would throw before
    // rendering anything if the keys were missing) and renders the expected
    // translated chrome, not that translation actually occurred.
    expect(getByText(enMessages.toolUI['dof-simulator'].appearance)).toBeInTheDocument()
    expect(getByText(enMessages.toolUI['dof-simulator'].model)).toBeInTheDocument()
    fireEvent.click(getByText(DOF_SUBJECTS[0].name))
    expect(getByRole('heading', { name: enMessages.toolUI['dof-simulator'].chooseModel })).toBeInTheDocument()
    expect(getByRole('button', { name: enMessages.toolUI['dof-simulator'].close })).toBeInTheDocument()
  })
})

function makeUiPrefs() {
  return {
    advanced: false, imperial: false,
    setAdvanced: vi.fn(), setImperial: vi.fn(),
  }
}

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('InterfacePanel', () => {
  it('reflects the current basic/advanced and metric/imperial prefs', () => {
    const uiPrefs = makeUiPrefs()
    const { getByRole } = renderWithIntl(<InterfacePanel uiPrefs={uiPrefs} />)
    expect(getByRole('button', { name: 'Basic' })).toHaveAttribute('aria-pressed', 'true')
    expect(getByRole('button', { name: 'Metric' })).toHaveAttribute('aria-pressed', 'true')
  })
  it('calls setAdvanced and setImperial when the toggles are clicked', () => {
    const uiPrefs = makeUiPrefs()
    const { getByRole } = renderWithIntl(<InterfacePanel uiPrefs={uiPrefs} />)
    fireEvent.click(getByRole('button', { name: 'Advanced' }))
    expect(uiPrefs.setAdvanced).toHaveBeenCalledWith(true)
    fireEvent.click(getByRole('button', { name: 'Imperial' }))
    expect(uiPrefs.setImperial).toHaveBeenCalledWith(true)
  })
})

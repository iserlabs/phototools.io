'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import { ResultsPanel, type ResultsLabels } from './ResultsPanel'
import type { DofDerived } from '../state/useDofDerived'
import type { BokehShapeId } from '@/lib/math/bokehKernel'

// The translated entry point for ResultsPanel: calls useTranslations() and
// passes the resulting strings down as the `labels` prop. ResultsPanel
// itself stays presentational (no i18n calls) — see ResultsPanel.tsx and
// results.test.tsx. Task 24's composition root should render this
// component, not ResultsPanel directly.
//
// `equivalentLink` is the one label that isn't a plain string: it wraps the
// equivalent-settings readout in a real cross-link to the Equivalent
// Settings Calculator, using next-intl's locale-aware Link (never
// next/link) so the href carries the current locale prefix.

interface ResultsPanelConnectedProps {
  derived: DofDerived
  imperial: boolean
  bokeh: BokehShapeId
}

export function ResultsPanelConnected({ derived, imperial, bokeh }: ResultsPanelConnectedProps) {
  const t = useTranslations('toolUI.dof-simulator')

  const labels: ResultsLabels = {
    results: t('results'),
    totalDoF: t('totalDoF'),
    nearFocus: t('nearFocus'),
    farFocus: t('farFocus'),
    inFront: t('inFront'),
    behind: t('behind'),
    hyperfocal: t('hyperfocal'),
    coc: t('coc'),
    backgroundBlur: t('backgroundBlur'),
    equivalentSettings: t('equivalentSettings'),
    equivalentLink: (children) => <Link href="/equivalent-settings-calculator">{children}</Link>,
    effectiveFocalLength: t('effectiveFocalLength'),
    fullFrameEquivalentFocalLength: t('fullFrameEquivalentFocalLength'),
    diffractionWarning: t('diffractionWarning'),
    belowMinFocusWarning: t('belowMinFocusWarning'),
  }

  return <ResultsPanel derived={derived} imperial={imperial} bokeh={bokeh} labels={labels} />
}

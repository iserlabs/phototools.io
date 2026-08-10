'use client'

import { useTranslations } from 'next-intl'
import { DofRuler, type RulerLabels } from './DofRuler'

// The translated entry point for DofRuler: calls useTranslations() and
// passes the resulting strings down as the `labels` prop. DofRuler itself
// stays presentational (no i18n calls) so it can be unit-tested without a
// NextIntlClientProvider — see DofRuler.tsx and dofRuler.test.tsx. The
// composition root should render this component, not DofRuler directly.

interface DofRulerConnectedProps {
  distanceM: number
  nearFocus: number
  farFocus: number
  hyperfocal: number
  onDistanceChange(v: number): void
}

export function DofRulerConnected({
  distanceM, nearFocus, farFocus, hyperfocal, onDistanceChange,
}: DofRulerConnectedProps) {
  const t = useTranslations('toolUI.dof-simulator')

  const labels: RulerLabels = {
    near: t('depthRulerNear'),
    far: t('depthRulerFar'),
    inFocus: t('depthRulerInFocus'),
    subject: t('depthRulerSubject'),
    hyperfocal: t('hyperfocal'),
    infinity: t('infinity'),
    distanceUnit: t('distanceUnit'),
  }

  return (
    <DofRuler
      distanceM={distanceM}
      nearFocus={nearFocus}
      farFocus={farFocus}
      hyperfocal={hyperfocal}
      onDistanceChange={onDistanceChange}
      labels={labels}
    />
  )
}

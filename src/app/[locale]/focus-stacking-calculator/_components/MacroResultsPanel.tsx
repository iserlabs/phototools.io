'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { InfoTooltip } from '@/components/shared/InfoTooltip'
import { getSkeletonBySlug } from '@/lib/data/education'
import { buildMacroText, buildMacroCsv, buildStackJson, formatMm, downloadTextFile } from '@/lib/utils/stackingExport'
import type { StackingState } from './useStackingState'
import s from './FocusStacking.module.css'

export function MacroResultsPanel({ state }: { state: StackingState }) {
  const t = useTranslations('toolUI.focus-stacking-calculator')
  const commonT = useTranslations('common')
  const et = useTranslations('education.focus-stacking-calculator')
  const skel = getSkeletonBySlug('focus-stacking-calculator')
  const tooltips = skel
    ? Object.fromEntries(
        skel.tooltipKeys.map((key) => [
          key,
          { term: et(`tooltips.${key}.term`), definition: et(`tooltips.${key}.definition`) },
        ]),
      )
    : undefined
  const r = state.macroResult
  const meta = {
    tool: 'focus-stacking-calculator', mode: 'macro',
    magnification: state.magnification, aperture: state.aperture,
    effectiveAperture: Number(r.effectiveAperture.toFixed(1)),
    sensor: state.sensor.name, overlapPct: state.overlapPct,
  }
  const handleCopy = useCallback(async () => {
    const text = buildMacroText(state.magnification, state.aperture, r.effectiveAperture, state.sensor.name, state.macroRows)
    try {
      await navigator.clipboard.writeText(text)
      toast(commonT('toast.linkCopied'))
    } catch {
      toast(commonT('toast.failedToCopy'))
    }
  }, [state.magnification, state.aperture, r.effectiveAperture, state.sensor.name, state.macroRows, commonT])
  return (
    <div className={s.panel}>
      <h3 className={s.panelTitle}>{t('results')}</h3>
      <div className={s.resultCard}>
        <span className={s.resultLabel}>
          {t('shotCount')}
          {tooltips?.shotCount && <InfoTooltip tooltip={tooltips.shotCount} />}
        </span>
        <span className={s.resultLarge}>{r.shotCount}</span>
      </div>
      <div className={s.resultsGrid}>
        <div className={s.resultCard}>
          <span className={s.resultLabel}>
            {t('railStep')}
            {tooltips?.railStep && <InfoTooltip tooltip={tooltips.railStep} />}
          </span>
          <span className={s.resultValue}>{formatMm(r.stepMm)}</span>
        </div>
        <div className={s.resultCard}>
          <span className={s.resultLabel}>{t('sliceDoF')}</span>
          <span className={s.resultValue}>{formatMm(r.sliceDofMm)}</span>
        </div>
        <div className={s.resultCard}>
          <span className={s.resultLabel}>
            {t('effectiveAperture')}
            {tooltips?.effectiveAperture && <InfoTooltip tooltip={tooltips.effectiveAperture} />}
          </span>
          <span className={s.resultValue}>f/{r.effectiveAperture.toFixed(1)}</span>
        </div>
        <div className={s.resultCard}>
          <span className={s.resultLabel}>{t('railTravel')}</span>
          <span className={s.resultValue}>{formatMm(r.railTravelMm)}</span>
        </div>
      </div>
      {r.diffractionLimited && (
        <div className={s.warningBanner}>
          {t('diffractionWarningMacro', {
            magnification: state.magnification, aperture: state.aperture,
            effective: r.effectiveAperture.toFixed(0), max: r.maxSharpAperture.toFixed(1),
          })}
        </div>
      )}
      {r.shotCount >= 100 && <div className={s.warningBanner}>{t('tooManyShots')}</div>}
      {!r.coverageComplete && <div className={s.warningBanner}>{t('coverageWarning')}</div>}
      <div className={s.exportRow}>
        <button className={s.copyBtn} onClick={handleCopy}>{t('exportPlan')}</button>
        <button className={s.copyBtn} onClick={() => {
          state.trackParam({ param_name: 'export', param_value: 'csv', input_type: 'button' })
          downloadTextFile('macro-stack.csv', buildMacroCsv(state.macroRows), 'text/csv')
        }}>{t('exportCSV')}</button>
        <button className={s.copyBtn} onClick={() => {
          state.trackParam({ param_name: 'export', param_value: 'json', input_type: 'button' })
          downloadTextFile('macro-stack.json', buildStackJson(meta, state.macroRows), 'application/json')
        }}>{t('exportJSON')}</button>
      </div>
    </div>
  )
}

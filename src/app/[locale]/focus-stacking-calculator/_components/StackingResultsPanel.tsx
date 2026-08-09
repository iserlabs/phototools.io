'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { InfoTooltip } from '@/components/shared/InfoTooltip'
import { getSkeletonBySlug } from '@/lib/data/education'
import { formatDistance } from '@/components/shared/DistanceField'
import { calcAiryDisk, calcHyperfocal } from '@/lib/math/dof'
import {
  buildDistanceText, buildDistanceCsv, buildStackJson, downloadTextFile,
} from '@/lib/utils/stackingExport'
import type { StackingState } from './useStackingState'
import s from './FocusStacking.module.css'

interface StackingResultsPanelProps {
  state: StackingState
}

export function StackingResultsPanel({ state }: StackingResultsPanelProps) {
  const {
    stackingResult: result, focalLength, aperture, sensor, overlapPct, coc, farLimit, trackParam,
  } = state
  const sensorName = sensor.name
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

  const { shots, totalDepth, coverageComplete } = result

  // Compute minimum overlap margin between adjacent shots
  const minOverlapMargin = shots.length >= 2
    ? Math.min(
        ...shots.slice(0, -1).map((shot, i) => {
          const next = shots[i + 1]
          return shot.farFocus - next.nearFocus
        }),
      )
    : 0

  // Per-shot DoF from first shot (representative)
  const perShotDoF = shots.length > 0
    ? shots[0].farFocus - shots[0].nearFocus
    : 0

  const handleCopy = useCallback(async () => {
    const text = buildDistanceText(focalLength, aperture, sensorName, shots)
    try {
      await navigator.clipboard.writeText(text)
      toast(commonT('toast.linkCopied'))
    } catch {
      toast(commonT('toast.failedToCopy'))
    }
  }, [focalLength, aperture, sensorName, shots, commonT])

  const meta = {
    tool: 'focus-stacking-calculator', mode: 'distance', focalLength, aperture, sensor: sensorName, overlapPct,
  }
  const diffractionWarning = calcAiryDisk(aperture) > coc
  // A finite far limit that fits in one shot keeps the plain "too few shots"
  // success message; an infinite far limit collapsing to one shot means that
  // one shot IS the hyperfocal shot, so it gets the hyperfocal-specific hint
  // instead — never both.
  const isSingleShotHyperfocal = shots.length === 1 && !isFinite(farLimit)
  const isSingleShotFinite = shots.length === 1 && isFinite(farLimit)

  return (
    <div className={s.panel}>
      <h3 className={s.panelTitle}>{t('results')}</h3>

      {/* Shot count - large display */}
      <div className={s.resultCard}>
        <span className={s.resultLabel}>
          {t('shotCount')}
          {tooltips?.shotCount && <InfoTooltip tooltip={tooltips.shotCount} />}
        </span>
        <span className={s.resultLarge}>{shots.length}</span>
      </div>

      {/* Grid: total depth, overlap margin, per-shot DoF */}
      <div className={s.resultsGrid}>
        <div className={s.resultCard}>
          <span className={s.resultLabel}>{t('totalDepth')}</span>
          <span className={s.resultValue}>{formatDistance(totalDepth)}</span>
        </div>
        <div className={s.resultCard}>
          <span className={s.resultLabel}>{t('overlapMargin')}</span>
          <span className={s.resultValue}>
            {minOverlapMargin > 0 ? formatDistance(minOverlapMargin) : '--'}
          </span>
        </div>
        <div className={s.resultCard}>
          <span className={s.resultLabel}>{t('perShotDoF')}</span>
          <span className={s.resultValue}>{formatDistance(perShotDoF)}</span>
        </div>
        <div className={s.resultCard}>
          <span className={s.resultLabel}>{t('overlap')}</span>
          <span className={s.resultValue}>{Math.round(overlapPct * 100)}%</span>
        </div>
      </div>

      {/* Warnings */}
      {diffractionWarning && (
        <div className={s.warningBanner}>{t('diffractionWarning', { aperture })}</div>
      )}
      {!coverageComplete && (
        <div className={s.warningBanner}>{t('coverageWarning')}</div>
      )}
      {isSingleShotHyperfocal && (
        <div className={s.successBanner}>
          {t('hyperfocalHint', { distance: formatDistance(calcHyperfocal(focalLength, aperture, coc)) })}
        </div>
      )}
      {isSingleShotFinite && (
        <div className={s.successBanner}>{t('tooFewShots')}</div>
      )}
      {shots.length >= 50 && (
        <div className={s.warningBanner}>{t('tooManyShots')}</div>
      )}

      {/* Export row */}
      <div className={s.exportRow}>
        <button className={s.copyBtn} onClick={handleCopy}>{t('exportPlan')}</button>
        <button
          className={s.copyBtn}
          onClick={() => {
            trackParam({ param_name: 'export', param_value: 'csv', input_type: 'button' })
            downloadTextFile('focus-stack.csv', buildDistanceCsv(shots), 'text/csv')
          }}
        >
          {t('exportCSV')}
        </button>
        <button
          className={s.copyBtn}
          onClick={() => {
            trackParam({ param_name: 'export', param_value: 'json', input_type: 'button' })
            downloadTextFile('focus-stack.json', buildStackJson(meta, shots), 'application/json')
          }}
        >
          {t('exportJSON')}
        </button>
      </div>
    </div>
  )
}

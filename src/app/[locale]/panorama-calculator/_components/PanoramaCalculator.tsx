'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { planPanorama } from '@/lib/math/panorama'
import { getSensor } from '@/lib/data/sensors'
import { useQueryInit, useToolQuerySync } from '@/lib/utils/querySync'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { ToolActions } from '@/components/shared/ToolActions'
import calc from '@/components/shared/Calculator.module.css'
import styles from './PanoramaCalculator.module.css'
import { PanoFanSvg } from './PanoFanSvg'
import { PanoControls } from './PanoControls'
import { type PanoState, PANO_PARAM_SCHEMA, PANO_DEFAULT_STATE } from './panoState'

export function PanoramaCalculator() {
  const t = useTranslations('toolUI.panorama-calculator')
  const { trackParam } = useToolSession()
  const [state, setState] = useState<PanoState>(PANO_DEFAULT_STATE)
  const { focal, sensor, orient, overlap, target, rows, mp } = state

  const setField = <K extends keyof PanoState>(key: K) => (value: PanoState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }))

  useQueryInit(PANO_PARAM_SCHEMA, {
    focal: setField('focal'), sensor: setField('sensor'), orient: setField('orient'),
    overlap: setField('overlap'), target: setField('target'), rows: setField('rows'), mp: setField('mp'),
  })
  useToolQuerySync(state, PANO_PARAM_SCHEMA)

  const set = (patch: Partial<PanoState>) => {
    for (const [key, value] of Object.entries(patch)) {
      trackParam({ param_name: key, param_value: String(value), input_type: 'select' })
    }
    setState((prev) => ({ ...prev, ...patch }))
  }

  const plan = useMemo(
    () => planPanorama({
      focalLength: focal,
      cropFactor: getSensor(sensor).cropFactor,
      orientation: orient,
      overlap: overlap / 100,
      targetHDeg: target,
      rows,
      megapixels: mp,
    }),
    [focal, sensor, orient, overlap, target, rows, mp],
  )

  return (
    <div className={styles.app}>
      <ToolHeading slug="panorama-calculator" />
      <div className={styles.appBody}>
        <div className={styles.sidebar}>
          <ToolActions toolSlug="panorama-calculator" />
          <PanoControls state={state} set={set} />
        </div>

        <div className={styles.main}>
          <PanoFanSvg
            frames={plan.framesPerRow}
            frameFovDeg={plan.frameFovH}
            incrementDeg={plan.incrementH}
            coverageDeg={plan.coverageH}
            label={t('fanLabel', { frames: plan.framesPerRow })}
          />
          <div className={styles.results}>
            <div className={calc.resultCard}>
              <span className={calc.resultLabel}>{t('totalShots')}</span>
              <span className={calc.resultValue}>{plan.totalFrames}</span>
            </div>
            <div className={calc.resultCard}>
              <span className={calc.resultLabel}>{t('perRow')}</span>
              <span className={calc.resultValue}>{t('perRowValue', { frames: plan.framesPerRow, rows })}</span>
            </div>
            <div className={calc.resultCard}>
              <span className={calc.resultLabel}>{t('rotateBetween')}</span>
              <span className={calc.resultValue}>{plan.incrementH.toFixed(1)}°</span>
            </div>
            <div className={calc.resultCard}>
              <span className={calc.resultLabel}>{t('coverage')}</span>
              <span className={calc.resultValue}>{Math.round(plan.coverageH)}° × {Math.round(plan.coverageV)}°</span>
            </div>
            <div className={calc.resultCard}>
              <span className={calc.resultLabel}>{t('frameFov')}</span>
              <span className={calc.resultValue}>{plan.frameFovH.toFixed(1)}° × {plan.frameFovV.toFixed(1)}°</span>
            </div>
            <div className={calc.resultCard}>
              <span className={calc.resultLabel}>{t('stitchedSize')}</span>
              <span className={calc.resultValue}>~{Math.round(plan.stitchedMp)} MP</span>
            </div>
          </div>
        </div>

        <div className={styles.desktopOnly}>
          <LearnPanel slug="panorama-calculator" />
        </div>
      </div>

      <div className={styles.mobileControls}>
        <PanoControls state={state} set={set} />
      </div>

      <RelatedTools variant="inline" currentSlug="panorama-calculator" />
      <div className={styles.mobileOnly}>
        <LearnPanel slug="panorama-calculator" />
      </div>
    </div>
  )
}

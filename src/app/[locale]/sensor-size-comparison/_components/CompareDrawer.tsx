'use client'

import { useTranslations } from 'next-intl'
import { compareSensors } from '@/lib/math/sensorComparison'
import { formatEv } from '@/lib/math/sensorEquivalence'
import { CompareColumn } from './CompareColumn'
import type { ResolvedSensor } from './sensorSizeTypes'
import ss from './SensorSize.module.css'

type CompareDrawerProps = {
  a: ResolvedSensor
  b: ResolvedSensor
  onClose: () => void
}

/**
 * Two-sensor comparison panel: a spec column per sensor (`CompareColumn`)
 * plus a plain-language relationship block — area ratio, both directions of
 * cross-sensor focal-length equivalence, and a light/reach verdict.
 *
 * The verdict is templated rather than written prose: 23 sensors make 253
 * possible pairs, so every sentence interpolates numbers from `compareSensors`,
 * and direction-aware math (`larger`/`smaller`) decides which sensor's name
 * goes in which slot — regardless of whether it was passed as `a` or `b`.
 */
export function CompareDrawer({ a, b, onClose }: CompareDrawerProps) {
  const t = useTranslations('toolUI.sensor-size-comparison')
  const sensorsT = useTranslations('common.sensors')
  const nameOf = (s: ResolvedSensor) => (sensorsT.has(s.id) ? sensorsT(s.id) : s.name)

  const cmp = compareSensors(a, b)

  const verdict = cmp.nearEqual
    ? t('compare.verdictNearEqual')
    : [
        t('compare.verdictLight', {
          larger: nameOf(cmp.larger === 'a' ? a : b),
          ratio: cmp.lightRatio.toFixed(1),
          ev: formatEv(cmp.lightEvAbs),
        }),
        t('compare.verdictReach', {
          smaller: nameOf(cmp.smaller === 'a' ? a : b),
          factor: cmp.reachFactor.toFixed(1),
        }),
      ].join(' ')

  return (
    <div className={ss.compareDrawer}>
      <div className={ss.compareHeader}>
        <h2 className={ss.compareTitle}>{t('compare.title')}</h2>
        <button
          type="button"
          className={ss.compareClose}
          aria-label={t('compare.close')}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className={ss.compareColumns}>
        <CompareColumn sensor={a} />
        <CompareColumn sensor={b} />
      </div>
      <div className={ss.compareRelation}>
        <p>{t('compare.areaRelation', { a: nameOf(a), b: nameOf(b), ratio: cmp.areaRatioAB.toFixed(2) })}</p>
        <p>{t('compare.crossFocal', { focal: 50, from: nameOf(a), to: nameOf(b), eqFocal: cmp.focalAonB })}</p>
        <p>{t('compare.crossFocal', { focal: 50, from: nameOf(b), to: nameOf(a), eqFocal: cmp.focalBonA })}</p>
        <p className={ss.compareVerdict} data-testid="compare-verdict">{verdict}</p>
      </div>
    </div>
  )
}

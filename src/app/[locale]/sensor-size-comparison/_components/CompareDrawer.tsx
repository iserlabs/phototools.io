'use client'

import { useEffect, useRef } from 'react'
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
  // From `useCompareEntry`'s `focusToken` — a monotonically increasing
  // counter that only advances on a user-initiated compare action (never on
  // the initial `?vs=` URL hydration). See the focus-management effect
  // below for why. Optional/defaulted so this component stays usable
  // without the wiring (e.g. in isolation in tests).
  focusToken?: number
}

// Single source for the focal length used in both the cross-focal-equivalence
// computation and its displayed sentence — passed explicitly to
// `compareSensors` rather than relying on its own default (`sensorComparison.ts`),
// so the number shown on screen can never drift from the number that was
// actually used to compute `focalAonB`/`focalBonA`.
const EQUIVALENCE_FOCAL = 50

/**
 * Two-sensor comparison panel: a spec column per sensor (`CompareColumn`)
 * plus a plain-language relationship block — area ratio (both directions),
 * both directions of cross-sensor focal-length equivalence, and a
 * light/reach verdict.
 *
 * The verdict is templated rather than written prose: 23 sensors make 253
 * possible pairs, so every sentence interpolates numbers from `compareSensors`,
 * and direction-aware math (`larger`/`smaller`) decides which sensor's name
 * goes in which slot — regardless of whether it was passed as `a` or `b`.
 */
export function CompareDrawer({ a, b, onClose, focusToken = 0 }: CompareDrawerProps) {
  const t = useTranslations('toolUI.sensor-size-comparison')
  const sensorsT = useTranslations('common.sensors')
  const nameOf = (s: ResolvedSensor) => (sensorsT.has(s.id) ? sensorsT(s.id) : s.name)

  const cmp = compareSensors(a, b, EQUIVALENCE_FOCAL)

  const headingRef = useRef<HTMLHeadingElement>(null)

  // Move focus into the drawer whenever it opens (or its pair changes) as a
  // direct result of a user action — expanding a row and picking a "Compare
  // with…" target, or clicking "Compare these two". Both entry points can
  // mount the drawer below the fold of `.main`'s `overflow: auto` scroll
  // container, or shift already-visible content down by the drawer's
  // height, with nothing announced to a screen reader. Focusing the
  // heading (tabIndex=-1, so it's programmatically focusable but not in tab
  // order) both announces "Compare sensors" via AT and brings the drawer
  // into view. `focusToken` only advances on those two user actions — never
  // on the initial mount from a shared `?vs=` link — so a page load from a
  // shared link never steals focus from wherever the user already is.
  // `scrollIntoView` is guarded because jsdom doesn't implement it.
  useEffect(() => {
    if (focusToken <= 0) return
    const el = headingRef.current
    if (!el) return
    el.focus()
    if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' })
  }, [focusToken])

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
        <h2 ref={headingRef} tabIndex={-1} className={ss.compareTitle}>{t('compare.title')}</h2>
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
        <p>{t('compare.areaRelation', { a: nameOf(b), b: nameOf(a), ratio: cmp.areaRatioBA.toFixed(2) })}</p>
        <p>{t('compare.crossFocal', { focal: EQUIVALENCE_FOCAL, from: nameOf(a), to: nameOf(b), eqFocal: cmp.focalAonB })}</p>
        <p>{t('compare.crossFocal', { focal: EQUIVALENCE_FOCAL, from: nameOf(b), to: nameOf(a), eqFocal: cmp.focalBonA })}</p>
        <p className={ss.compareVerdict} data-testid="compare-verdict">{verdict}</p>
      </div>
    </div>
  )
}

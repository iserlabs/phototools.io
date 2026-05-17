'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { shutterWithNd, formatShutterSpeed } from '@/lib/math/exposure'
import { getToolBySlug } from '@/lib/data/tools'
import { useQueryInit, useToolQuerySync, intParam } from '@/lib/utils/querySync'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolActions } from '@/components/shared/ToolActions'
import calc from '@/components/shared/Calculator.module.css'
import nd from './NdFilterCalculator.module.css'
import { BASE_SHUTTER_SPEEDS, ND_FILTERS, TABLE_FILTERS } from '@/lib/data/ndFilters'




const PARAM_SCHEMA = {
  base: intParam(6, 0, 15),
  nd: intParam(2, 0, 9),
}

const tool = getToolBySlug('nd-filter-calculator')!

function ControlsPanel({ baseIdx, ndIdx, resultSpeed, ndStops, onBaseChange, onNdChange }: {
  baseIdx: number
  ndIdx: number
  resultSpeed: number
  ndStops: number
  onBaseChange: (idx: number) => void
  onNdChange: (idx: number) => void
}) {
  const t = useTranslations('toolUI.nd-filter-calculator')
  return (
    <>
      <div className={nd.header}>
        <h1 className={nd.title}>{tool.name}</h1>
        <p className={nd.description}>{tool.description}</p>
      </div>

      <div className={calc.field}>
        <label className={calc.label}>{t('baseShutterSpeed')}</label>
        <select
          className={calc.select}
          value={baseIdx}
          onChange={(e) => onBaseChange(Number(e.target.value))}
        >
          {BASE_SHUTTER_SPEEDS.map((s, i) => (
            <option key={s.label} value={i}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className={calc.field}>
        <label className={calc.label}>{t('ndFilter')}</label>
        <select
          className={calc.select}
          value={ndIdx}
          onChange={(e) => onNdChange(Number(e.target.value))}
        >
          {ND_FILTERS.map((f, i) => (
            <option key={f.factor} value={i}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className={calc.resultCard}>
        <span className={calc.resultLabel}>{t('resultingShutterSpeed')}</span>
        <span className={calc.resultValue}>{formatShutterSpeed(resultSpeed)}</span>
      </div>
      <div className={calc.resultCard}>
        <span className={calc.resultLabel}>{t('stopsAdded')}</span>
        <span className={calc.resultValue}>{ndStops}</span>
      </div>
    </>
  )
}

export function NdFilterCalculator() {
  const t = useTranslations('toolUI.nd-filter-calculator')
  const { trackParam } = useToolSession()
  const [baseIdx, setBaseIdx] = useState(6)
  const [ndIdx, setNdIdx] = useState(2)
  useQueryInit(PARAM_SCHEMA, { base: setBaseIdx, nd: setNdIdx })

  useToolQuerySync({ base: baseIdx, nd: ndIdx }, PARAM_SCHEMA)

  const baseShutter = BASE_SHUTTER_SPEEDS[baseIdx].value
  const ndFilter = ND_FILTERS[ndIdx]

  const resultSpeed = useMemo(() => shutterWithNd(baseShutter, ndFilter.stops), [baseShutter, ndFilter.stops])

  const controlsProps = {
    baseIdx,
    ndIdx,
    resultSpeed,
    ndStops: ndFilter.stops,
    onBaseChange: (v: number) => { trackParam({ param_name: 'base_shutter', param_value: BASE_SHUTTER_SPEEDS[v].label, input_type: 'select' }); setBaseIdx(v) },
    onNdChange: (v: number) => { trackParam({ param_name: 'nd_filter', param_value: ND_FILTERS[v].label, input_type: 'select' }); setNdIdx(v) },
  }

  return (
    <div className={nd.app}>
      <div className={nd.appBody}>
        <div className={nd.sidebar}>
          <ToolActions toolSlug="nd-filter-calculator" />
          <ControlsPanel {...controlsProps} />
        </div>

        <div className={nd.main}>
          <h3 className={nd.tableTitle}>{t('quickReference')}</h3>
          <div className={calc.tableWrap}>
            <table className={calc.table}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>{t('tableBase')}</th>
                  {TABLE_FILTERS.map((f) => (
                    <th key={f.factor}>{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BASE_SHUTTER_SPEEDS.map((s) => (
                  <tr key={s.label}>
                    <td style={{ textAlign: 'left', fontWeight: 500 }}>{s.label}</td>
                    {TABLE_FILTERS.map((f) => (
                      <td key={f.factor}>{formatShutterSpeed(shutterWithNd(s.value, f.stops))}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={nd.desktopOnly}>
          <LearnPanel slug="nd-filter-calculator" />
        </div>
      </div>

      <div className={nd.mobileControls}>
        <ControlsPanel {...controlsProps} />
      </div>

      <RelatedTools variant="inline" currentSlug="nd-filter-calculator" />
      <div className={nd.mobileOnly}>
        <LearnPanel slug="nd-filter-calculator" />
      </div>
    </div>
  )
}

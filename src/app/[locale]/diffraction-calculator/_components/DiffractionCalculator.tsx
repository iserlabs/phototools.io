'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { pixelPitch, diffractionLimitedAperture, airyDiskDiameterUm, apertureVerdict } from '@/lib/math/diffraction'
import { SENSORS, getSensor } from '@/lib/data/sensors'
import { APERTURES_THIRD_STOP, APERTURES_FULL_STOP } from '@/lib/data/camera'
import { useQueryInit, useToolQuerySync, intParam, sensorParam } from '@/lib/utils/querySync'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { ToolActions } from '@/components/shared/ToolActions'
import calc from '@/components/shared/Calculator.module.css'
import styles from './DiffractionCalculator.module.css'

const F8_INDEX = APERTURES_THIRD_STOP.indexOf(8)
const TABLE_MP = [16, 24, 45, 61]
const TABLE_SENSOR_IDS = ['ff', 'apsc_n', 'apsc_c', 'm43', '1in']

const PARAM_SCHEMA = {
  sensor: sensorParam('ff'),
  mp: intParam(24, 8, 150),
  ap: intParam(F8_INDEX, 0, APERTURES_THIRD_STOP.length - 1),
}

function ControlsPanel({ sensor, mp, ap, onChange }: {
  sensor: string
  mp: number
  ap: number
  onChange: (patch: { sensor?: string; mp?: number; ap?: number }) => void
}) {
  const t = useTranslations('toolUI.diffraction-calculator')
  const toolsT = useTranslations('tools')
  return (
    <>
      <div className={styles.header}>
        <h2 className={styles.title}>{toolsT('diffraction-calculator.name')}</h2>
        <p className={styles.description}>{toolsT('diffraction-calculator.description')}</p>
      </div>

      <div className={calc.field}>
        <label className={calc.label}>{t('sensor')}</label>
        <select className={calc.select} value={sensor} onChange={(e) => onChange({ sensor: e.target.value })}>
          {SENSORS.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className={calc.field}>
        <label className={calc.label}>{t('megapixels', { mp })}</label>
        <input type="range" min={8} max={150} step={1} value={mp} onChange={(e) => onChange({ mp: Number(e.target.value) })} />
      </div>

      <div className={calc.field}>
        <label className={calc.label}>{t('aperture')}</label>
        <select className={calc.select} value={ap} onChange={(e) => onChange({ ap: Number(e.target.value) })}>
          {APERTURES_THIRD_STOP.map((f, i) => (
            <option key={f} value={i}>f/{f}</option>
          ))}
        </select>
      </div>
    </>
  )
}

export function DiffractionCalculator() {
  const t = useTranslations('toolUI.diffraction-calculator')
  const { trackParam } = useToolSession()
  const [sensor, setSensor] = useState('ff')
  const [mp, setMp] = useState(24)
  const [ap, setAp] = useState(F8_INDEX)

  useQueryInit(PARAM_SCHEMA, { sensor: setSensor, mp: setMp, ap: setAp })
  useToolQuerySync({ sensor, mp, ap }, PARAM_SCHEMA)

  const onChange = (patch: { sensor?: string; mp?: number; ap?: number }) => {
    if (patch.sensor !== undefined) { trackParam({ param_name: 'sensor', param_value: patch.sensor, input_type: 'select' }); setSensor(patch.sensor) }
    if (patch.mp !== undefined) { trackParam({ param_name: 'mp', param_value: String(patch.mp), input_type: 'slider' }); setMp(patch.mp) }
    if (patch.ap !== undefined) { trackParam({ param_name: 'aperture', param_value: String(APERTURES_THIRD_STOP[patch.ap]), input_type: 'select' }); setAp(patch.ap) }
  }

  const { pitch, limit, airy, verdict, fNumber } = useMemo(() => {
    const s = getSensor(sensor)
    const pitchUm = pixelPitch(s.w ?? 36, mp, s.h)
    const limitF = diffractionLimitedAperture(pitchUm)
    const f = APERTURES_THIRD_STOP[ap]
    return { pitch: pitchUm, limit: limitF, airy: airyDiskDiameterUm(f), verdict: apertureVerdict(f, limitF), fNumber: f }
  }, [sensor, mp, ap])

  const controlsProps = { sensor, mp, ap, onChange }

  return (
    <div className={styles.app}>
      <ToolHeading slug="diffraction-calculator" />
      <div className={styles.appBody}>
        <div className={styles.sidebar}>
          <ToolActions toolSlug="diffraction-calculator" />
          <ControlsPanel {...controlsProps} />
        </div>

        <div className={styles.main}>
          <div className={styles.verdictBlock}>
            <span className={`${styles.verdictBadge} ${styles[verdict]}`}>{t(`verdict.${verdict}`, { f: `f/${fNumber}` })}</span>
            <p className={styles.verdictText}>{t(`verdictDetail.${verdict}`, { limit: `f/${limit.toFixed(1)}` })}</p>
          </div>

          <div className={styles.strip} role="img" aria-label={t('stripLabel')}>
            {APERTURES_FULL_STOP.map((f) => (
              <div key={f} className={`${styles.stop} ${styles[`stop_${apertureVerdict(f, limit)}`]} ${f === fNumber ? styles.stopActive : ''}`}>
                f/{f}
              </div>
            ))}
          </div>

          <div className={styles.results}>
            <div className={calc.resultCard}>
              <span className={calc.resultLabel}>{t('pixelPitch')}</span>
              <span className={calc.resultValue}>{pitch.toFixed(2)} µm</span>
            </div>
            <div className={calc.resultCard}>
              <span className={calc.resultLabel}>{t('airyDisk')}</span>
              <span className={calc.resultValue}>{airy.toFixed(1)} µm</span>
            </div>
            <div className={calc.resultCard}>
              <span className={calc.resultLabel}>{t('diffractionLimit')}</span>
              <span className={calc.resultValue}>f/{limit.toFixed(1)}</span>
            </div>
          </div>

          <h3 className={styles.tableTitle}>{t('tableTitle')}</h3>
          <div className={calc.tableWrap}>
            <table className={calc.table}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>{t('tableSensor')}</th>
                  {TABLE_MP.map((m) => (
                    <th key={m}>{m} MP</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE_SENSOR_IDS.map((id) => {
                  const s = getSensor(id)
                  return (
                    <tr key={id}>
                      <td style={{ textAlign: 'left', fontWeight: 500 }}>{s.name}</td>
                      {TABLE_MP.map((m) => (
                        <td key={m}>f/{diffractionLimitedAperture(pixelPitch(s.w ?? 36, m, s.h)).toFixed(1)}</td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.desktopOnly}>
          <LearnPanel slug="diffraction-calculator" />
        </div>
      </div>

      <div className={styles.mobileControls}>
        <ControlsPanel {...controlsProps} />
      </div>

      <RelatedTools variant="inline" currentSlug="diffraction-calculator" />
      <div className={styles.mobileOnly}>
        <LearnPanel slug="diffraction-calculator" />
      </div>
    </div>
  )
}

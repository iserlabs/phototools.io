'use client'

import { useTranslations } from 'next-intl'
import { type PanoOrientation } from '@/lib/math/panorama'
import { SENSORS } from '@/lib/data/sensors'
import { FocalLengthField } from '@/components/shared/FocalLengthField'
import { ModeToggle } from '@/components/shared/ModeToggle'
import calc from '@/components/shared/Calculator.module.css'
import styles from './PanoramaCalculator.module.css'
import { type PanoState, TARGET_WIDTHS, ROW_OPTIONS } from './panoState'

interface PanoControlsProps {
  state: PanoState
  set: (patch: Partial<PanoState>) => void
}

export function PanoControls({ state, set }: PanoControlsProps) {
  const t = useTranslations('toolUI.panorama-calculator')
  const toolsT = useTranslations('tools')
  return (
    <>
      <div className={styles.header}>
        <h2 className={styles.title}>{toolsT('panorama-calculator.name')}</h2>
        <p className={styles.description}>{toolsT('panorama-calculator.description')}</p>
      </div>

      <FocalLengthField value={state.focal} onChange={(focal) => set({ focal })} />

      <div className={calc.field}>
        <label className={calc.label}>{t('sensor')}</label>
        <select className={calc.select} value={state.sensor} onChange={(e) => set({ sensor: e.target.value })}>
          {SENSORS.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <ModeToggle<PanoOrientation>
        title={t('orientation')}
        options={[
          { value: 'portrait', label: t('portrait') },
          { value: 'landscape', label: t('landscape') },
        ]}
        value={state.orient}
        onChange={(orient) => set({ orient })}
      />

      <div className={calc.field}>
        <label className={calc.label}>{t('overlap', { percent: state.overlap })}</label>
        <input
          type="range" min={10} max={60} step={5} value={state.overlap}
          onChange={(e) => set({ overlap: Number(e.target.value) })}
        />
      </div>

      <div className={calc.field}>
        <label className={calc.label}>{t('targetWidth')}</label>
        <select className={calc.select} value={state.target} onChange={(e) => set({ target: Number(e.target.value) })}>
          {TARGET_WIDTHS.map((deg) => (
            <option key={deg} value={deg}>{deg}°</option>
          ))}
        </select>
      </div>

      <div className={calc.field}>
        <label className={calc.label}>{t('rows')}</label>
        <select className={calc.select} value={state.rows} onChange={(e) => set({ rows: Number(e.target.value) })}>
          {ROW_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className={calc.field}>
        <label className={calc.label}>{t('megapixels', { mp: state.mp })}</label>
        <input
          type="range" min={8} max={150} step={1} value={state.mp}
          onChange={(e) => set({ mp: Number(e.target.value) })}
        />
      </div>
    </>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import ss from './SensorSize.module.css'

export function CustomSensorForm({ onAdd }: { onAdd: (name: string, w: number, h: number, mp: number) => void }) {
  const t = useTranslations('toolUI.sensor-size-comparison')
  const [name, setName] = useState('')
  const [w, setW] = useState('')
  const [h, setH] = useState('')
  const [mp, setMp] = useState('')
  const [warning, setWarning] = useState<string | null>(null)
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (warningTimer.current) clearTimeout(warningTimer.current)
  }, [])

  const clampDim = (val: string, setter: (v: string) => void) => {
    const num = parseFloat(val)
    if (!isNaN(num) && num > 99) {
      setter('99')
      setWarning(t('maxDimensionWarning'))
      if (warningTimer.current) clearTimeout(warningTimer.current)
      warningTimer.current = setTimeout(() => setWarning(null), 2000)
    } else {
      setter(val.slice(0, 5))
    }
  }

  const handleSubmit = () => {
    const wn = parseFloat(w)
    const hn = parseFloat(h)
    const mpn = parseFloat(mp) || 0
    if (!name.trim() || isNaN(wn) || isNaN(hn) || wn <= 0 || hn <= 0) return
    onAdd(name.trim(), wn, hn, mpn)
    setName(''); setW(''); setH(''); setMp('')
  }

  return (
    <div className={ss.customForm}>
      <input className={ss.customInput} placeholder={t('placeholderName')} value={name} onChange={e => setName(e.target.value)} />
      <div className={ss.customRow}>
        <input className={ss.customInput} placeholder={t('placeholderW')} type="number" inputMode="decimal" step="0.1" min="0.1" value={w} onChange={e => clampDim(e.target.value, setW)} />
        <span className={ss.customX} aria-hidden="true">×</span>
        <input className={ss.customInput} placeholder={t('placeholderH')} type="number" inputMode="decimal" step="0.1" min="0.1" value={h} onChange={e => clampDim(e.target.value, setH)} />
      </div>
      {warning && <div className={ss.customWarning} role="status" aria-live="polite">{warning}</div>}
      <input className={ss.customInput} placeholder={t('placeholderMP')} type="number" inputMode="numeric" step="1" min="1" value={mp} onChange={e => setMp(e.target.value)} />
      <button type="button" className={ss.customAddBtn} onClick={handleSubmit} disabled={!name.trim() || !w || !h}>
        {t('addSensor')}
      </button>
    </div>
  )
}

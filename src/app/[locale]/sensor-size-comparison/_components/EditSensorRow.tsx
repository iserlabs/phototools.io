'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { COMMON_MP } from '@/lib/data/sensors'
import type { SensorPreset } from '@/lib/types'
import ss from './SensorSize.module.css'

export function EditSensorRow({ sensor, onSave, onCancel }: {
  sensor: Required<SensorPreset>
  onSave: (id: string, name: string, w: number, h: number, mp: number) => void
  onCancel: () => void
}) {
  const t = useTranslations('toolUI.sensor-size-comparison')
  const mp = COMMON_MP[sensor.id]?.[0]?.mp ?? 0
  const [name, setName] = useState(sensor.name)
  const [w, setW] = useState(String(sensor.w))
  const [h, setH] = useState(String(sensor.h))
  const [mpVal, setMpVal] = useState(mp > 0 ? String(mp) : '')

  const handleSave = () => {
    const wn = Math.min(parseFloat(w), 99)
    const hn = Math.min(parseFloat(h), 99)
    if (!name.trim() || isNaN(wn) || isNaN(hn) || wn <= 0 || hn <= 0) return
    onSave(sensor.id, name.trim(), wn, hn, parseFloat(mpVal) || 0)
  }

  return (
    <div className={ss.editForm}>
      <input className={ss.customInput} value={name} onChange={e => setName(e.target.value)} placeholder={t('placeholderName')} />
      <div className={ss.customRow}>
        <input className={ss.customInput} value={w} onChange={e => setW(e.target.value.slice(0, 5))} type="number" inputMode="decimal" step="0.1" min="0.1" placeholder={t('placeholderW')} />
        <span className={ss.customX} aria-hidden="true">×</span>
        <input className={ss.customInput} value={h} onChange={e => setH(e.target.value.slice(0, 5))} type="number" inputMode="decimal" step="0.1" min="0.1" placeholder={t('placeholderH')} />
      </div>
      <input className={ss.customInput} value={mpVal} onChange={e => setMpVal(e.target.value)} type="number" inputMode="numeric" step="1" min="1" placeholder={t('placeholderMPShort')} />
      <div className={ss.editActions}>
        <button type="button" className={ss.customAddBtn} onClick={handleSave}>{t('save')}</button>
        <button type="button" className={ss.editCancelBtn} onClick={onCancel}>{t('cancelEdit')}</button>
      </div>
    </div>
  )
}

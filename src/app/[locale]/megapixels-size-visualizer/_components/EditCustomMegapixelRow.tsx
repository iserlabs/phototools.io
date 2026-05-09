'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { CustomMegapixel } from '@/lib/types'
import ss from './MegapixelVisualizer.module.css'

interface Props {
  mp: CustomMegapixel
  onSave: (id: string, name: string, mp: number) => void
  onCancel: () => void
}

export function EditCustomMegapixelRow({ mp, onSave, onCancel }: Props) {
  const t = useTranslations('toolUI.megapixels-size-visualizer')
  const [name, setName] = useState(mp.name)
  const [mpValue, setMpValue] = useState(String(mp.mp))

  const handleSave = () => {
    const mpNum = parseFloat(mpValue)
    if (!name.trim() || !mpNum || mpNum <= 0 || mpNum > 1000) return
    onSave(mp.id, name.trim(), mpNum)
  }

  return (
    <div className={ss.editRow}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={ss.textInput}
      />
      <input
        type="number"
        inputMode="decimal"
        value={mpValue}
        onChange={(e) => setMpValue(e.target.value)}
        className={ss.numberInput}
        min={1}
        max={1000}
        step="0.1"
      />
      <button type="button" onClick={handleSave} className={ss.saveButton}>
        {t('save')}
      </button>
      <button type="button" onClick={onCancel} className={ss.cancelButton}>
        {t('cancelEdit')}
      </button>
    </div>
  )
}

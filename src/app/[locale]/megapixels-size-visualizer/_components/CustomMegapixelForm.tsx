'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import ss from './MegapixelVisualizer.module.css'

interface Props {
  onAdd: (name: string, mp: number) => void
}

export function CustomMegapixelForm({ onAdd }: Props) {
  const t = useTranslations('toolUI.megapixels-size-visualizer')
  const [mp, setMp] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = () => {
    setError(null)
    const mpNum = parseFloat(mp)
    if (!mpNum || mpNum <= 0) {
      setError(t('mpMustBePositive'))
      return
    }
    if (mpNum > 1000) {
      setError(t('mpMaxExceeded'))
      return
    }
    const name = `${mpNum} MP`
    onAdd(name, mpNum)
    setMp('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className={ss.customForm} data-testid="custom-mp-form">
      <input
        type="number"
        inputMode="decimal"
        placeholder={t('placeholderMp')}
        value={mp}
        onChange={(e) => setMp(e.target.value)}
        onKeyDown={handleKeyDown}
        className={`${ss.customInput} ${ss.customFormName}`}
        min={1}
        max={1000}
        step="0.1"
        data-testid="custom-mp-value"
        aria-label={t('placeholderMp')}
        aria-invalid={error ? true : undefined}
      />
      <button
        type="button"
        onClick={handleAdd}
        className={`${ss.customAddBtn} ${ss.customFormAddBtn}`}
        aria-label={t('addMegapixel')}
        title={t('addMegapixel')}
        data-testid="custom-mp-add"
      >
        +
      </button>
      {error && <div className={`${ss.customWarning} ${ss.customFormError}`} role="alert">{error}</div>}
    </div>
  )
}

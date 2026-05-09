'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import styles from './ColorHarmony.module.css'

interface Swatch {
  hue: number
  rgb: { r: number; g: number; b: number }
  hex: string
}

interface PaletteBarProps {
  swatches: Swatch[]
  baseIndex: number
}

export function PaletteBar({ swatches, baseIndex }: PaletteBarProps) {
  const t = useTranslations('toolUI.color-scheme-generator')
  const [copiedHex, setCopiedHex] = useState<string | null>(null)
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)
  const hexTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fmtTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (hexTimerRef.current) clearTimeout(hexTimerRef.current)
    if (fmtTimerRef.current) clearTimeout(fmtTimerRef.current)
  }, [])

  const copyHex = useCallback(async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex)
      setCopiedHex(hex)
      if (hexTimerRef.current) clearTimeout(hexTimerRef.current)
      hexTimerRef.current = setTimeout(() => setCopiedHex(null), 1500)
    } catch {
      // ignore
    }
  }, [])

  const copyPalette = useCallback(async (format: string) => {
    let text = ''
    if (format === 'hex') {
      text = swatches.map((s) => s.hex).join(', ')
    } else if (format === 'css') {
      text = swatches.map((s, i) => `--color-${i + 1}: ${s.hex};`).join('\n')
    } else if (format === 'rgb') {
      text = swatches.map((s) => `rgb(${s.rgb.r}, ${s.rgb.g}, ${s.rgb.b})`).join(', ')
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopiedFormat(format)
      if (fmtTimerRef.current) clearTimeout(fmtTimerRef.current)
      fmtTimerRef.current = setTimeout(() => setCopiedFormat(null), 1500)
    } catch {
      // ignore
    }
  }, [swatches])

  return (
    <div className={styles.paletteBar}>
      {swatches.map((s, i) => (
        <button
          key={i}
          className={`${styles.paletteBarSwatch} ${i === baseIndex ? styles.paletteBarSwatchKey : ''}`}
          style={{ backgroundColor: s.hex }}
          onClick={() => copyHex(s.hex)}
          title={i === baseIndex ? t('keyColorLabel') : t('clickToCopyHex')}
        >
          <div className={styles.paletteBarInfo}>
            <span className={styles.paletteBarHex}>
              {copiedHex === s.hex ? t('copiedExcl') : s.hex}
            </span>
            <span className={styles.paletteBarRgb}>
              rgb({s.rgb.r}, {s.rgb.g}, {s.rgb.b})
            </span>
          </div>
        </button>
      ))}
      <div className={styles.copyGroup}>
        <span className={styles.copyLabel}>{t('copyColors')}</span>
        <div className={styles.copyButtons}>
          <button className={styles.copyBtn} onClick={() => copyPalette('hex')} title={t('copyHexCodes')}>
            {copiedFormat === 'hex' ? t('copiedExcl') : t('hexFormat')}
          </button>
          <button className={styles.copyBtn} onClick={() => copyPalette('css')} title={t('copyCssVariables')}>
            {copiedFormat === 'css' ? t('copiedExcl') : t('cssFormat')}
          </button>
          <button className={styles.copyBtn} onClick={() => copyPalette('rgb')} title={t('copyRgbValues')}>
            {copiedFormat === 'rgb' ? t('copiedExcl') : t('rgbFormat')}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useTranslations } from 'next-intl'
import { ToolActions } from '@/components/shared/ToolActions'
import { PhotoUploadPanel } from '@/components/shared/PhotoUploadPanel'
import { HARMONY_KEYS, type HarmonyType } from './colorHarmonyHelpers'
import styles from './ColorHarmony.module.css'

interface ColorSidebarProps {
  harmony: HarmonyType
  setHarmony: (h: HarmonyType) => void
  suggestion: string
  baseHex: string
  displayedHex: string
  applyHex: (hex: string) => void
  setHexDraft: (v: string | null) => void
  hue: number; setHue: (v: number) => void
  saturation: number; setSaturation: (v: number) => void
  lightness: number; setLightness: (v: number) => void
  splitAngle: number; setSplitAngle: (v: number) => void
  analogousSpread: number; setAnalogousSpread: (v: number) => void
  tetradicOffset: number; setTetradicOffset: (v: number) => void
  exportCanvasRef: React.RefObject<HTMLCanvasElement | null>
  buildExportCanvas: () => void
  onPhotoFile: (file: File) => void
}

export function ColorSidebar(props: ColorSidebarProps) {
  const t = useTranslations('toolUI.color-scheme-generator')
  const {
    harmony, setHarmony, suggestion, baseHex, displayedHex, applyHex, setHexDraft,
    hue, setHue, saturation, setSaturation, lightness, setLightness,
    splitAngle, setSplitAngle, analogousSpread, setAnalogousSpread,
    tetradicOffset, setTetradicOffset,
    exportCanvasRef, buildExportCanvas, onPhotoFile,
  } = props

  return (
    <aside className={styles.sidebar}>
      <ToolActions toolSlug="color-scheme-generator" canvasRef={exportCanvasRef} imageFilename="color-scheme.png" onBeforeCopyImage={buildExportCanvas} />

      <div className={styles.field}>
        <span className={styles.label}>{t('colorScheme')}</span>
        <div className={styles.radioGroup}>
          {HARMONY_KEYS.map((o) => (
            <button key={o.value}
              className={`${styles.radioBtn} ${harmony === o.value ? styles.radioBtnActive : ''}`}
              onClick={() => setHarmony(o.value)}
            >
              {t(o.key as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.suggestion}>{suggestion}</div>

      <div className={styles.field}>
        <span className={styles.label}>{t('keyColor')}</span>
        <div className={styles.keyColorRow}>
          <input type="color" value={baseHex} onChange={(e) => applyHex(e.target.value)} className={styles.colorPicker} />
          <input type="text" value={displayedHex}
            onChange={(e) => { setHexDraft(e.target.value); applyHex(e.target.value) }}
            onFocus={() => setHexDraft(baseHex)}
            onBlur={() => setHexDraft(null)}
            className={styles.hexInput} spellCheck={false} maxLength={7}
            autoComplete="off" autoCapitalize="off" enterKeyHint="done"
          />
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>{t('hue')} <span className={styles.value}>{hue}°</span></span>
        <input type="range" className={styles.slider} min={0} max={359} step={1} value={hue} onChange={(e) => setHue(Number(e.target.value))} />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>{t('saturation')} <span className={styles.value}>{saturation}%</span></span>
        <input type="range" className={styles.slider} min={0} max={100} step={1} value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>{t('lightness')} <span className={styles.value}>{lightness}%</span></span>
        <input type="range" className={styles.slider} min={0} max={100} step={1} value={lightness} onChange={(e) => setLightness(Number(e.target.value))} />
      </div>

      {harmony === 'split-complementary' && (
        <div className={styles.field}>
          <span className={styles.label}>{t('splitAngle')} <span className={styles.value}>{splitAngle}°</span></span>
          <input type="range" className={styles.slider} min={10} max={80} step={1} value={splitAngle} onChange={(e) => setSplitAngle(Number(e.target.value))} />
        </div>
      )}

      {harmony === 'analogous' && (
        <div className={styles.field}>
          <span className={styles.label}>{t('spread')} <span className={styles.value}>{analogousSpread}°</span></span>
          <input type="range" className={styles.slider} min={5} max={60} step={1} value={analogousSpread} onChange={(e) => setAnalogousSpread(Number(e.target.value))} />
        </div>
      )}

      {harmony === 'tetradic' && (
        <div className={styles.field}>
          <span className={styles.label}>{t('rectangleWidth')} <span className={styles.value}>{tetradicOffset}°</span>{tetradicOffset === 90 && ` ${t('square')}`}</span>
          <input type="range" className={styles.slider} min={10} max={170} step={1} value={tetradicOffset} onChange={(e) => setTetradicOffset(Number(e.target.value))} />
        </div>
      )}

      <PhotoUploadPanel label={t('pickFromPhoto')} prompt={t('dropPhotoPrompt')} onFile={onPhotoFile} />
    </aside>
  )
}

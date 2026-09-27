'use client'

import { ToolActions } from '@/components/shared/ToolActions'
import { HARMONY_KEYS, type HarmonyType, type TemplateHarmony } from '@/lib/data/colorAnalyzer'
import { SampleCard, type SampleCardProps } from './SampleCard'
import styles from './ColorAnalyzer.module.css'

export interface KeyCardProps {
  hue: number
  saturation: number
  lightness: number
  hex: string
  onHue: (v: number) => void
  onSaturation: (v: number) => void
  onLightness: (v: number) => void
  onHex: (hex: string) => void
  labels: { keyColor: string; hue: string; saturation: string; lightness: string }
}

export interface AnalyzerSidebarProps {
  toolSlug: string
  exportCanvasRef: React.RefObject<HTMLCanvasElement | null>
  buildExportCanvas: () => void
  harmony: HarmonyType
  onHarmony: (h: HarmonyType) => void
  harmonyLabels: Record<HarmonyType, string>
  closestFit: { type: TemplateHarmony; meanError: number } | null
  labels: { colorScheme: string; closestFit: string; closestSentence: string | null; suggestion: string; samplesHeading: string; splitAngle: string; spread: string; rectangleWidth: string; square: string }
  params: { splitAngle: number; analogousSpread: number; tetradicOffset: number }
  onParams: (patch: Partial<AnalyzerSidebarProps['params']>) => void
  keyCard: KeyCardProps | null
  sampleCards: SampleCardProps[]
}

function Slider({ label, value, unit, min, max, onChange }: { label: string; value: number; unit: string; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label} <span className={styles.value}>{value}{unit}</span></span>
      <input type="range" className={styles.slider} aria-label={label} min={min} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}

function KeyCard(k: KeyCardProps) {
  return (
    <div className={styles.keyCard}>
      <span className={styles.label}>{k.labels.keyColor}</span>
      <div className={styles.keyColorRow}>
        <input type="color" value={k.hex} onChange={(e) => k.onHex(e.target.value)} className={styles.colorPicker} />
        <input
          type="text"
          defaultValue={k.hex}
          key={k.hex}
          className={styles.hexInput}
          spellCheck={false}
          maxLength={7}
          onBlur={(e) => k.onHex(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') k.onHex((e.target as HTMLInputElement).value) }}
        />
      </div>
      <Slider label={k.labels.hue} value={k.hue} unit="°" min={0} max={359} onChange={k.onHue} />
      <Slider label={k.labels.saturation} value={k.saturation} unit="%" min={0} max={100} onChange={k.onSaturation} />
      <Slider label={k.labels.lightness} value={k.lightness} unit="%" min={0} max={100} onChange={k.onLightness} />
    </div>
  )
}

export function AnalyzerSidebar(p: AnalyzerSidebarProps) {
  const { labels } = p
  return (
    <aside className={styles.sidebar}>
      <ToolActions toolSlug={p.toolSlug} canvasRef={p.exportCanvasRef} imageFilename="color-analyzer.png" onBeforeCopyImage={p.buildExportCanvas} />

      <div className={styles.field}>
        <span className={styles.label}>{labels.colorScheme}</span>
        <div className={styles.radioGroup}>
          {HARMONY_KEYS.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`${styles.radioBtn} ${p.harmony === o.value ? styles.radioBtnActive : ''}`}
              onClick={() => p.onHarmony(o.value)}
            >
              {p.harmonyLabels[o.value]}
              {p.closestFit?.type === o.value && <span className={styles.badge}>★</span>}
            </button>
          ))}
        </div>
        {p.closestFit && labels.closestSentence && (
          <button type="button" className={styles.closestFit} onClick={() => p.onHarmony(p.closestFit!.type)}>
            <strong>{labels.closestFit}</strong> {labels.closestSentence}
          </button>
        )}
      </div>

      <div className={styles.suggestion}>{labels.suggestion}</div>

      {p.harmony === 'split-complementary' && (
        <Slider label={labels.splitAngle} value={p.params.splitAngle} unit="°" min={10} max={80} onChange={(v) => p.onParams({ splitAngle: v })} />
      )}
      {p.harmony === 'analogous' && (
        <Slider label={labels.spread} value={p.params.analogousSpread} unit="°" min={5} max={60} onChange={(v) => p.onParams({ analogousSpread: v })} />
      )}
      {p.harmony === 'tetradic' && (
        <Slider
          label={`${labels.rectangleWidth}${p.params.tetradicOffset === 90 ? ` ${labels.square}` : ''}`}
          value={p.params.tetradicOffset}
          unit="°"
          min={10}
          max={170}
          onChange={(v) => p.onParams({ tetradicOffset: v })}
        />
      )}

      {p.keyCard ? (
        <KeyCard {...p.keyCard} />
      ) : (
        <>
          <span className={styles.label}>{labels.samplesHeading}</span>
          <ul className={styles.sampleList}>
            {p.sampleCards.map((c) => <SampleCard key={c.sample.id} {...c} />)}
          </ul>
        </>
      )}
    </aside>
  )
}

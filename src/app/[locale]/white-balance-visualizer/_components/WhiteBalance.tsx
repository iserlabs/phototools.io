'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { kelvinToRgb } from '@/lib/math/color'
import { getToolBySlug } from '@/lib/data/tools'
import { WB_PRESETS, WB_SCENES } from '@/lib/data/whiteBalance'
import { useQueryInit, useToolQuerySync, intParam, strParam } from '@/lib/utils/querySync'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolActions } from '@/components/shared/ToolActions'
import { PhotoUploadPanel } from '@/components/shared/PhotoUploadPanel'
import { WbPreview } from './WbPreview'
import calc from '@/components/shared/Calculator.module.css'
import wb from './WhiteBalance.module.css'

const SCENE_IDS = WB_SCENES.map(s => s.id) as readonly string[]

const PARAM_SCHEMA = {
  k: intParam(5500, 2000, 10000),
  scene: strParam(SCENE_IDS[0], SCENE_IDS),
}

const tool = getToolBySlug('white-balance-visualizer')!

function ControlsPanel({ kelvin, rgb, activePreset, onKelvinChange, onFile }: {
  kelvin: number
  rgb: { r: number; g: number; b: number }
  activePreset: (typeof WB_PRESETS)[number] | undefined
  onKelvinChange: (k: number) => void
  onFile: (file: File) => void
}) {
  const t = useTranslations('toolUI.white-balance-visualizer')
  return (
    <>
      <div className={wb.header}>
        <h1 className={wb.title}>{tool.name}</h1>
        <p className={wb.description}>{tool.description}</p>
      </div>

      <div className={calc.field}>
        <label className={calc.label}>
          {t('colorTemperature')} <span className={calc.value}>{kelvin}K</span>
          {activePreset && (
            <span className={wb.presetTag}> ({activePreset.name})</span>
          )}
        </label>
        <input
          type="range"
          className={calc.slider}
          min={2000}
          max={10000}
          step={100}
          value={kelvin}
          onChange={(e) => onKelvinChange(Number(e.target.value))}
        />
        <div className={wb.sliderLabels}>
          <span>2000K</span>
          <span>{t('warm')}</span>
          <span>{t('neutral')}</span>
          <span>{t('cool')}</span>
          <span>10000K</span>
        </div>
      </div>

      <div className={calc.field}>
        <label className={calc.label}>{t('presets')}</label>
        <div className={wb.presetRow}>
          {WB_PRESETS.map((p) => (
            <button
              key={p.name}
              className={`${wb.presetBtn} ${kelvin === p.kelvin ? wb.presetBtnActive : ''}`}
              onClick={() => onKelvinChange(p.kelvin)}
              title={`${p.name} (${p.kelvin}K)`}
            >
              <span
                className={wb.presetDot}
                style={{ backgroundColor: (() => { const c = kelvinToRgb(p.kelvin); return `rgb(${c.r},${c.g},${c.b})` })() }}
              />
              <span className={wb.presetName}>{p.name}</span>
              <span className={wb.presetK}>{p.kelvin}K</span>
            </button>
          ))}
        </div>
      </div>

      <div className={wb.rgbCards}>
        <div className={calc.resultCard}>
          <span className={calc.resultLabel}>{t('red')}</span>
          <span className={calc.resultValue}>{rgb.r}</span>
        </div>
        <div className={calc.resultCard}>
          <span className={calc.resultLabel}>{t('green')}</span>
          <span className={calc.resultValue}>{rgb.g}</span>
        </div>
        <div className={calc.resultCard}>
          <span className={calc.resultLabel}>{t('blue')}</span>
          <span className={calc.resultValue}>{rgb.b}</span>
        </div>
        <div className={calc.resultCard}>
          <span className={calc.resultLabel}>{t('hex')}</span>
          <span className={calc.resultValue}>
            #{rgb.r.toString(16).padStart(2, '0')}
            {rgb.g.toString(16).padStart(2, '0')}
            {rgb.b.toString(16).padStart(2, '0')}
          </span>
        </div>
      </div>

      <PhotoUploadPanel onFile={onFile} />
    </>
  )
}

export function WhiteBalance() {
  const { trackParam } = useToolSession()
  const [kelvin, setKelvin] = useState(5500)
  const [sceneId, setSceneId] = useState(SCENE_IDS[0])
  const [customSrc, setCustomSrc] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const sceneIdx = WB_SCENES.findIndex(s => s.id === sceneId)

  useQueryInit(PARAM_SCHEMA, { k: setKelvin, scene: setSceneId })
  useToolQuerySync({ k: kelvin, scene: sceneId }, PARAM_SCHEMA)

  const rgb = useMemo(() => kelvinToRgb(kelvin), [kelvin])

  const activePreset = WB_PRESETS.find((p) => p.kelvin === kelvin)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    if (customSrc) URL.revokeObjectURL(customSrc)
    setCustomSrc(URL.createObjectURL(file))
  }, [customSrc])

  const handleRemoveCustom = useCallback(() => {
    if (customSrc) URL.revokeObjectURL(customSrc)
    setCustomSrc(null)
  }, [customSrc])

  const controlsProps = {
    kelvin, rgb, activePreset,
    onKelvinChange: (v: number) => { trackParam({ param_name: 'kelvin', param_value: String(v), input_type: 'slider' }); setKelvin(v) },
    onFile: handleFile,
  }

  return (
    <div className={wb.app}>
      <div className={wb.appBody}>
        <div className={wb.sidebar}>
          <ToolActions toolSlug="white-balance-visualizer" canvasRef={canvasRef} imageFilename="white-balance.png" />
          <ControlsPanel {...controlsProps} />
        </div>

        <WbPreview rgb={rgb} kelvin={kelvin} customSrc={customSrc} onFile={handleFile} onRemoveCustom={handleRemoveCustom} canvasRef={canvasRef} sceneIdx={sceneIdx} onSceneChange={(idx) => { if (idx >= 0) setSceneId(WB_SCENES[idx].id) }} />

        <div className={wb.desktopOnly}>
          <LearnPanel slug="white-balance-visualizer" />
        </div>
      </div>

      <div className={wb.mobileControls}>
        <ControlsPanel {...controlsProps} />
      </div>

      <RelatedTools variant="inline" currentSlug="white-balance-visualizer" />
      <div className={wb.mobileOnly}>
        <LearnPanel slug="white-balance-visualizer" />
      </div>
    </div>
  )
}

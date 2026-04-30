'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { hslToRgb, rgbToHsl } from '@/lib/math/color'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { useQueryInit, useToolQuerySync, intParam, strParam } from '@/lib/utils/querySync'
import styles from './ColorHarmony.module.css'
import { ColorWheel, type ColorWheelHandle } from './ColorWheel'
import { PhotoPicker } from './PhotoPicker'
import type { HarmonyType } from './colorHarmonyHelpers'
import { rgbToHex, getHarmonyHues, getBaseIndex, getSuggestion } from './colorHarmonyHelpers'
import { ColorSidebar } from './ColorSidebar'
import { PaletteBar } from './PaletteBar'
import { buildColorExportCanvas } from './buildColorExport'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'

const PARAM_SCHEMA = {
  h: intParam(200, 0, 359),
  sat: intParam(70, 0, 100),
  l: intParam(50, 0, 100),
  type: strParam<HarmonyType>('complementary', ['complementary', 'analogous', 'triadic', 'split-complementary', 'tetradic'] as const),
  split: intParam(30, 10, 80),
  tet: intParam(60, 10, 170),
  spread: intParam(30, 5, 60),
}

export function ColorHarmony() {
  const t = useTranslations('toolUI.color-scheme-generator')
  const { trackParam } = useToolSession()
  const [hue, setHue] = useState(200)
  const [saturation, setSaturation] = useState(70)
  const [lightness, setLightness] = useState(50)
  const [harmony, setHarmony] = useState<HarmonyType>('complementary')
  const [splitAngle, setSplitAngle] = useState(30)
  const [tetradicOffset, setTetradicOffset] = useState(60)
  const [analogousSpread, setAnalogousSpread] = useState(30)

  useQueryInit(PARAM_SCHEMA, {
    h: setHue, sat: setSaturation, l: setLightness, type: setHarmony,
    split: setSplitAngle, tet: setTetradicOffset, spread: setAnalogousSpread,
  })
  useToolQuerySync(
    { h: hue, sat: saturation, l: lightness, type: harmony, split: splitAngle, tet: tetradicOffset, spread: analogousSpread },
    PARAM_SCHEMA,
  )

  const wheelRef = useRef<ColorWheelHandle>(null)
  const exportCanvasRef = useRef<HTMLCanvasElement>(null)
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | undefined>(undefined)
  const [hexDraft, setHexDraft] = useState<string | null>(null)

  const baseRgb = useMemo(() => hslToRgb(hue, saturation, lightness), [hue, saturation, lightness])
  const baseHex = rgbToHex(baseRgb.r, baseRgb.g, baseRgb.b)
  const displayedHex = hexDraft ?? baseHex

  const applyHex = useCallback((hex: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const hsl = rgbToHsl(r, g, b)
    setHue(Math.round(hsl.h)); setSaturation(Math.round(hsl.s)); setLightness(Math.round(hsl.l))
  }, [])

  const baseIndex = getBaseIndex(harmony)
  const harmonyHues = useMemo(() => getHarmonyHues(hue, harmony, splitAngle, analogousSpread, tetradicOffset), [hue, harmony, splitAngle, analogousSpread, tetradicOffset])
  const swatches = useMemo(() => harmonyHues.map((h) => { const rgb = hslToRgb(h, saturation, lightness); return { hue: h, rgb, hex: rgbToHex(rgb.r, rgb.g, rgb.b) } }), [harmonyHues, saturation, lightness])
  const suggestionKey = useMemo(() => getSuggestion(hue, harmony), [hue, harmony])
  const suggestion = t(suggestionKey as Parameters<typeof t>[0])

  const handleSecondaryDrag = useCallback((nodeIndex: number, draggedHue: number) => {
    if (harmony === 'split-complementary') {
      const opposite = (hue + 180) % 360
      let diff = draggedHue - opposite
      if (diff > 180) diff -= 360; if (diff < -180) diff += 360
      setSplitAngle(Math.round(Math.min(80, Math.max(10, Math.abs(diff)))))
    } else if (harmony === 'analogous') {
      let diff = draggedHue - hue
      if (diff > 180) diff -= 360; if (diff < -180) diff += 360
      setAnalogousSpread(Math.round(Math.min(60, Math.max(5, Math.abs(diff)))))
    } else if (harmony === 'tetradic') {
      let diff: number
      if (nodeIndex === 1) diff = draggedHue - hue
      else diff = draggedHue - ((hue + 180) % 360)
      if (diff > 180) diff -= 360; if (diff < -180) diff += 360
      setTetradicOffset(Math.round(Math.min(170, Math.max(10, Math.abs(diff)))))
    }
  }, [harmony, hue])

  const draggableNodes = useMemo(() => {
    if (harmony === 'split-complementary') return [1, 2]
    if (harmony === 'analogous') return [0, 2]
    if (harmony === 'tetradic') return [1, 3]
    return []
  }, [harmony])

  const buildExportCanvas = useCallback(() => {
    const wheelCanvas = wheelRef.current?.getCanvas()
    const exportCanvas = exportCanvasRef.current
    if (!wheelCanvas || !exportCanvas) return
    buildColorExportCanvas(wheelCanvas, exportCanvas, swatches, harmony, baseIndex, (key) => t(key as Parameters<typeof t>[0]))
  }, [swatches, harmony, baseIndex, t])

  return (
    <div className={styles.wrapper}>
      <ToolHeading slug="color-scheme-generator" />
      <ColorSidebar
        harmony={harmony} setHarmony={(v) => { trackParam({ param_name: 'harmony', param_value: v, input_type: 'select' }); setHarmony(v) }} suggestion={suggestion}
        baseHex={baseHex} displayedHex={displayedHex} applyHex={applyHex} setHexDraft={setHexDraft}
        hue={hue} setHue={setHue} saturation={saturation} setSaturation={setSaturation}
        lightness={lightness} setLightness={setLightness}
        splitAngle={splitAngle} setSplitAngle={setSplitAngle}
        analogousSpread={analogousSpread} setAnalogousSpread={setAnalogousSpread}
        tetradicOffset={tetradicOffset} setTetradicOffset={setTetradicOffset}
        exportCanvasRef={exportCanvasRef} buildExportCanvas={buildExportCanvas}
        onPhotoFile={(file) => { setPhotoFile(file); setShowPhotoPicker(true) }}
      />

      <div className={styles.rightSide}>
        <PaletteBar swatches={swatches} baseIndex={baseIndex} />
        <div className={styles.mainArea}>
          <ColorWheel ref={wheelRef} hue={hue} saturation={saturation} lightness={lightness}
            harmonyHues={harmonyHues} baseIndex={baseIndex} draggableNodes={draggableNodes}
            onHueChange={(v) => { trackParam({ param_name: 'hue', param_value: String(v), input_type: 'slider' }); setHue(v) }}
            onSaturationChange={setSaturation} onSecondaryDrag={handleSecondaryDrag} />
        </div>
      </div>
      <div className={styles.desktopOnly}><LearnPanel slug="color-scheme-generator" /></div>

      {showPhotoPicker && (
        <PhotoPicker initialFile={photoFile}
          onColorPick={(hex) => { applyHex(hex); setShowPhotoPicker(false); setPhotoFile(undefined) }}
          onClose={() => { setShowPhotoPicker(false); setPhotoFile(undefined) }} />
      )}
      <div className={styles.mobileOnly}><LearnPanel slug="color-scheme-generator" /></div>
      <canvas ref={exportCanvasRef} style={{ display: 'none' }} />
    </div>
  )
}

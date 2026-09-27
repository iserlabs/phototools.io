'use client'

import { useCallback, useMemo, useReducer, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { useQueryInit, useToolQuerySync, intParam, strParam } from '@/lib/utils/querySync'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { hslToRgb, rgbToHsl } from '@/lib/math/color'
import { HARMONY_KEYS, SAMPLE_CAP, type HarmonyType } from '@/lib/data/colorAnalyzer'
import { colorNameKey, directionBandKey } from '@/lib/math/color-name'
import { fitHarmony, rankHarmonies, buildPalette, rgbToHex, type FitSample, type HarmonyParams } from '@/lib/math/color-fit'
import type { WheelDot, WheelTarget, WheelArrow } from './drawWheel'
import { ColorWheel, WheelViewToggle, type ColorWheelHandle, type WheelView } from './ColorWheel'
import { PhotoPane } from './PhotoPane'
import { AnalyzerSidebar } from './AnalyzerSidebar'
import type { SampleCardProps } from './SampleCard'
import { PaletteBar } from './PaletteBar'
import { buildColorExportCanvas } from './buildColorExport'
import { sampleReducer, EMPTY_STATE, newSampleId } from './analyzerState'
import { decodeToAnalysisCanvas, sampleAt, autoPickPoints, type AnalysisPhoto } from './useSampling'
import styles from './ColorAnalyzer.module.css'

const HARMONY_VALUES = HARMONY_KEYS.map((h) => h.value)
const PARAM_SCHEMA = {
  h: intParam(200, 0, 359),
  sat: intParam(70, 0, 100),
  l: intParam(50, 0, 100),
  type: strParam<HarmonyType>('complementary', HARMONY_VALUES),
  split: intParam(30, 10, 80),
  tet: intParam(60, 10, 170),
  spread: intParam(30, 5, 60),
  view: strParam<WheelView>('natural', ['natural', 'pure', 'guide'] as const),
}

const SLUG = 'color-analyzer'

export function ColorAnalyzer() {
  const t = useTranslations(`toolUI.${SLUG}`)
  const { trackParam } = useToolSession()

  // ── generator/key state (URL-synced) ────────────────────────────────
  const [hue, setHue] = useState(200)
  const [saturation, setSaturation] = useState(70)
  const [lightness, setLightness] = useState(50)
  const [harmony, setHarmonyState] = useState<HarmonyType>('complementary')
  const [splitAngle, setSplitAngle] = useState(30)
  const [tetradicOffset, setTetradicOffset] = useState(60)
  const [analogousSpread, setAnalogousSpread] = useState(30)
  const [view, setViewState] = useState<WheelView>('natural')

  useQueryInit(PARAM_SCHEMA, { h: setHue, sat: setSaturation, l: setLightness, type: setHarmonyState, split: setSplitAngle, tet: setTetradicOffset, spread: setAnalogousSpread, view: setViewState })
  useToolQuerySync({ h: hue, sat: saturation, l: lightness, type: harmony, split: splitAngle, tet: tetradicOffset, spread: analogousSpread, view }, PARAM_SCHEMA)

  // ── photo + samples ─────────────────────────────────────────────────
  const [photo, setPhoto] = useState<AnalysisPhoto | null>(null)
  const [state, dispatch] = useReducer(sampleReducer, EMPTY_STATE)
  const { samples, selectedId, customTargets } = state
  const hasSamples = samples.length > 0
  const params: HarmonyParams = useMemo(() => ({ splitAngle, analogousSpread, tetradicOffset }), [splitAngle, analogousSpread, tetradicOffset])

  const setHarmony = useCallback((h: HarmonyType) => {
    trackParam({ param_name: 'harmony', param_value: h, input_type: 'select' })
    if (h === 'custom') dispatch({ type: 'resetCustomTargets' })
    setHarmonyState(h)
  }, [trackParam])

  const setView = useCallback((v: WheelView) => {
    trackParam({ param_name: 'view', param_value: v, input_type: 'toggle' })
    setViewState(v)
  }, [trackParam])

  const onFile = useCallback(async (file: File) => {
    try {
      const decoded = await decodeToAnalysisCanvas(file)
      setPhoto(decoded)
      dispatch({ type: 'clear' })
    } catch { /* FileDropZone already filtered non-images; a decode failure leaves the pane empty */ }
  }, [])

  const addSample = useCallback((x: number, y: number) => {
    if (!photo) return
    const color = sampleAt(photo, x, y)
    const id = newSampleId()
    dispatch({ type: 'add', id, x, y, color, label: t(`names.${colorNameKey(color.hsl)}` as Parameters<typeof t>[0]) })
    trackParam({ param_name: 'sample_add', param_value: String(samples.length + 1), input_type: 'button' })
  }, [photo, t, trackParam, samples.length])

  const moveSample = useCallback((id: string, x: number, y: number) => {
    if (!photo) return
    dispatch({ type: 'move', id, x, y, color: sampleAt(photo, x, y) })
  }, [photo])

  const autoPick = useCallback(() => {
    if (!photo) return
    const points = autoPickPoints(photo)
    const next = points.map((pt) => {
      const color = sampleAt(photo, pt.x, pt.y)
      return { id: newSampleId(), x: pt.x, y: pt.y, ...color, label: t(`names.${colorNameKey(color.hsl)}` as Parameters<typeof t>[0]), locked: false }
    })
    dispatch({ type: 'replaceAll', samples: next })
    trackParam({ param_name: 'auto_pick', param_value: String(next.length), input_type: 'button' })
  }, [photo, t, trackParam])

  // ── derived ─────────────────────────────────────────────────────────
  const fitSamples: FitSample[] = useMemo(() => samples.map((s) => ({ id: s.id, h: s.hsl.h, s: s.hsl.s, l: s.hsl.l, neutral: s.neutral })), [samples])
  const lockedId = samples.find((s) => s.locked)?.id ?? null
  const keySample: FitSample = useMemo(() => ({ id: 'key', h: hue, s: saturation, l: lightness, neutral: false }), [hue, saturation, lightness])
  const scored = useMemo(() => (hasSamples ? fitSamples : [keySample]), [hasSamples, fitSamples, keySample])

  const fit = useMemo(() => fitHarmony(scored, harmony, params, { lockedId, customTargets, fallbackHue: hue }), [scored, harmony, params, lockedId, customTargets, hue])
  const closest = useMemo(() => (hasSamples ? rankHarmonies(fitSamples, params)[0] ?? null : null), [hasSamples, fitSamples, params])

  const fill = useMemo(() => {
    const locked = samples.find((s) => s.locked)
    if (locked) return { s: locked.hsl.s, l: locked.hsl.l }
    const scorable = samples.filter((s) => !s.neutral)
    if (scorable.length) return { s: Math.round(scorable.reduce((a, s) => a + s.hsl.s, 0) / scorable.length), l: Math.round(scorable.reduce((a, s) => a + s.hsl.l, 0) / scorable.length) }
    return { s: saturation, l: lightness }
  }, [samples, saturation, lightness])

  const palette = useMemo(() => buildPalette(fit, scored, harmony, fill), [fit, scored, harmony, fill])
  const wheelLightness = hasSamples ? 50 : lightness
  const resultById = useMemo(() => new Map(fit.results.map((r) => [r.id, r])), [fit])

  const dots: WheelDot[] = useMemo(() => samples.map((s, i) => ({
    id: s.id, hue: s.hsl.h, r: view === 'pure' ? 100 : s.hsl.s, hex: rgbToHex(s.rgb.r, s.rgb.g, s.rgb.b),
    index: i + 1, isKey: s.locked, neutral: s.neutral,
  })), [samples, view])

  const showGuide = !hasSamples || view === 'guide'
  const targets: WheelTarget[] = useMemo(() => {
    if (!showGuide) return []
    if (harmony === 'custom') return fit.slots.map((sl) => {
      const s = samples.find((x) => x.id === sl.sampleIds[0])
      return { id: sl.sampleIds[0], hue: sl.hue, r: view === 'pure' ? 100 : (s?.hsl.s ?? fill.s), filled: false }
    })
    return fit.slots.map((sl, i) => ({ id: `slot-${i}`, hue: sl.hue, r: hasSamples && view !== 'pure' ? fill.s : (hasSamples ? 100 : saturation), filled: sl.sampleIds.length > 0 }))
  }, [showGuide, harmony, fit, samples, view, fill.s, hasSamples, saturation])

  const arrows: WheelArrow[] = useMemo(() => {
    if (!hasSamples || view !== 'guide') return []
    return fit.results.filter((r) => r.band !== 'aligned').map((r) => {
      const s = samples.find((x) => x.id === r.id)!
      return { fromId: r.id, toHue: r.targetHue, toR: s.hsl.s }
    })
  }, [hasSamples, view, fit, samples])

  // ── strings ─────────────────────────────────────────────────────────
  const tk = (k: string) => t(k as Parameters<typeof t>[0])
  const harmonyLabels = Object.fromEntries(HARMONY_KEYS.map((h) => [h.value, tk(h.key)])) as Record<HarmonyType, string>
  const anchorWarm = (fit.anchorHue < 70) || fit.anchorHue >= 330
  const anchorCool = fit.anchorHue >= 170 && fit.anchorHue < 270
  const suggestionKey = (() => {
    const base = HARMONY_KEYS.find((h) => h.value === harmony)!.key
    const tone = anchorWarm ? 'warm' : anchorCool ? 'cool' : 'default'
    return `suggestions.${base}.${tone}`
  })()
  const nudgeFor = (id: string): string | null => {
    const r = resultById.get(id); const s = samples.find((x) => x.id === id)
    if (!r || !s) return null
    if (r.band === 'aligned') return tk('nudge.aligned')
    const dir = tk(`names.${directionBandKey(s.hsl.h, r.targetHue, r.delta)}`)
    return t(r.band === 'slight' ? 'nudge.slight' : 'nudge.big', { color: dir })
  }

  const sampleCards: SampleCardProps[] = samples.map((s, i) => ({
    index: i + 1, sample: s, colorName: tk(`names.${colorNameKey(s.hsl)}`), result: resultById.get(s.id) ?? null,
    nudge: nudgeFor(s.id), selected: s.id === selectedId, showGuide: view === 'guide',
    labels: { lock: tk('lock'), unlock: tk('unlock'), remove: tk('removeSample'), copied: tk('copiedExcl'), neutral: tk('neutralNotScored'), labelPlaceholder: tk('labelPlaceholder'), suggested: tk('suggested') },
    onSelect: () => dispatch({ type: 'select', id: s.id }),
    onLabelChange: (label) => dispatch({ type: 'relabel', id: s.id, label }),
    onLock: (locked) => { trackParam({ param_name: 'lock', param_value: String(locked), input_type: 'toggle' }); dispatch({ type: 'lock', id: s.id, locked }) },
    onRemove: () => dispatch({ type: 'remove', id: s.id }),
    onNudgePosition: (dx, dy) => { if (photo) moveSample(s.id, s.x + dx / photo.width, s.y + dy / photo.height) },
  }))

  const keyHex = (() => { const rgb = hslToRgb(hue, saturation, lightness); return rgbToHex(rgb.r, rgb.g, rgb.b) })()
  const applyHex = (hex: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return
    const hsl = rgbToHsl(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16))
    setHue(hsl.h); setSaturation(hsl.s); setLightness(hsl.l)
  }

  // ── export ──────────────────────────────────────────────────────────
  const wheelRef = useRef<ColorWheelHandle>(null)
  const exportCanvasRef = useRef<HTMLCanvasElement>(null)
  const buildExportCanvas = useCallback(() => {
    const wheelCanvas = wheelRef.current?.getCanvas(); const exportCanvas = exportCanvasRef.current
    if (!wheelCanvas || !exportCanvas) return
    buildColorExportCanvas({ wheelCanvas, exportCanvas, swatches: palette, photo, samples, title: harmonyLabels[harmony] })
  }, [palette, photo, samples, harmonyLabels, harmony])

  return (
    <div className={styles.wrapper}>
      <ToolHeading slug={SLUG} />
      <AnalyzerSidebar
        toolSlug={SLUG} exportCanvasRef={exportCanvasRef} buildExportCanvas={buildExportCanvas}
        harmony={harmony} onHarmony={setHarmony} harmonyLabels={harmonyLabels}
        closestFit={closest ? { type: closest.type, meanError: closest.meanError } : null}
        labels={{
          colorScheme: tk('colorScheme'), closestFit: tk('closestFit'),
          closestSentence: closest ? t('closestSentence', { harmony: harmonyLabels[closest.type], degrees: Math.round(closest.meanError) }) : null,
          suggestion: tk(suggestionKey), samplesHeading: tk('samples'),
          splitAngle: tk('splitAngle'), spread: tk('spread'), rectangleWidth: tk('rectangleWidth'), square: tk('square'),
        }}
        params={params}
        onParams={(patch) => { if (patch.splitAngle !== undefined) setSplitAngle(patch.splitAngle); if (patch.analogousSpread !== undefined) setAnalogousSpread(patch.analogousSpread); if (patch.tetradicOffset !== undefined) setTetradicOffset(patch.tetradicOffset) }}
        keyCard={hasSamples ? null : {
          hue, saturation, lightness, hex: keyHex,
          onHue: (v) => { trackParam({ param_name: 'hue', param_value: String(v), input_type: 'slider' }); setHue(v) },
          onSaturation: setSaturation, onLightness: setLightness, onHex: applyHex,
          labels: { keyColor: tk('keyColor'), hue: tk('hue'), saturation: tk('saturation'), lightness: tk('lightness') },
        }}
        sampleCards={sampleCards}
      />

      <div className={styles.rightSide}>
        <PaletteBar swatches={palette} />
        <div className={styles.centerRow}>
          <PhotoPane
            photo={photo} samples={samples} selectedId={selectedId} canAdd={samples.length < SAMPLE_CAP}
            labels={{ drop: tk('dropPhotoPrompt'), change: tk('changePhoto'), autoPick: tk('autoPick'), capReached: t('capReached', { cap: SAMPLE_CAP }),
              marker: (n, label) => t('markerLabel', { n, label }), remove: tk('removeSample') }}
            onFile={onFile} onAdd={addSample} onMove={moveSample}
            onSelect={(id) => dispatch({ type: 'select', id })} onRemove={(id) => dispatch({ type: 'remove', id })}
            onAutoPick={autoPick} onChangePhoto={() => { setPhoto(null); dispatch({ type: 'clear' }) }}
          />
          <div className={styles.wheelColumn}>
            <ColorWheel ref={wheelRef}
              lightness={wheelLightness} dots={dots} targets={targets} arrows={arrows}
              keyDot={hasSamples ? null : { hue, s: saturation }} selectedId={selectedId}
              customDraggable={harmony === 'custom' && view === 'guide'}
              onKeyChange={(h, s) => { setHue(h); setSaturation(s) }}
              onSelectDot={(id) => dispatch({ type: 'select', id })}
              onCustomTargetDrag={(id, h) => dispatch({ type: 'setCustomTarget', id, hue: h })}
            />
            {hasSamples && (
              <WheelViewToggle view={view} onChange={setView} labels={{ natural: tk('viewNatural'), pure: tk('viewPure'), guide: tk('viewGuide') }} />
            )}
            <p className={styles.wheelHint}>{tk(hasSamples ? `viewHint.${view}` : 'viewHint.key')}</p>
          </div>
        </div>
      </div>

      <div className={styles.desktopOnly}><LearnPanel slug={SLUG} /></div>
      <RelatedTools variant="inline" currentSlug={SLUG} />
      <div className={styles.mobileOnly}><LearnPanel slug={SLUG} /></div>
      <canvas ref={exportCanvasRef} style={{ display: 'none' }} />
    </div>
  )
}

'use client'

import { useReducer, useRef, useCallback, useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { DEFAULT_FOV_STATE, LENS_COLORS, LENS_LABELS, MAX_LENSES } from '@/lib/data/fovSimulator'
import { parseQueryParams, useQuerySync } from './querySync'
import { fovReducer } from './fovReducer'
import { useTheme } from '@/components/layout/ThemeProvider'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolActions } from '@/components/shared/ToolActions'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { Sidebar } from './Sidebar'
import { LensPanel } from './LensPanel'
import { SCENES } from '@/lib/data/scenes'
import { ScenePicker } from '@/components/shared/ScenePicker'
import { Canvas, type OverlayOffsets } from './Canvas'
import { CropStrip } from './CropStrip'
import { SourceFocalLengthPopover } from './SourceFocalLengthPopover'
import { extractFocalLength } from './extractFocalLength'
import styles from './FovSimulator.module.css'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'

export function FovSimulator() {
  const t = useTranslations('toolUI.fov-simulator')
  const { trackParam } = useToolSession()
  const [state, dispatch] = useReducer(fovReducer, DEFAULT_FOV_STATE)
  const [hydrated, setHydrated] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})
  const [overlayOffsets, setOverlayOffsets] = useState<OverlayOffsets>({})
  const [cropExpanded, setCropExpanded] = useState(true)
  const [customImageSrc, setCustomImageSrc] = useState<string | null>(null)
  const [sourceFocalLength, setSourceFocalLength] = useState<number | null>(null)
  const [exifDetected, setExifDetected] = useState<'fl35' | 'fl' | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cleanCanvasRef = useRef<HTMLCanvasElement>(null)
  const sourceImageRef = useRef<HTMLImageElement | null>(null)
  const { theme, setTheme } = useTheme()

  const handleCustomFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (customImageSrc) URL.revokeObjectURL(customImageSrc)
    setCustomImageSrc(URL.createObjectURL(file))
    dispatch({ type: 'SET_IMAGE', payload: -1 })
    const exif = await extractFocalLength(file)
    if (exif.focalLength35) {
      setSourceFocalLength(exif.focalLength35)
      setExifDetected('fl35')
    } else if (exif.focalLength) {
      setSourceFocalLength(exif.focalLength)
      setExifDetected('fl')
    } else {
      setSourceFocalLength(null)
      setExifDetected(null)
    }
  }, [customImageSrc])

  const handleCustomRemove = useCallback(() => {
    if (customImageSrc) URL.revokeObjectURL(customImageSrc)
    setCustomImageSrc(null)
    setSourceFocalLength(null)
    setExifDetected(null)
    if (state.imageIndex === -1) dispatch({ type: 'SET_IMAGE', payload: 0 })
  }, [customImageSrc, state.imageIndex])

  useQuerySync(state)

  useEffect(() => {
    if (hydrated) return
    setHydrated(true)
    const queryOverrides = parseQueryParams()
    const orientation = queryOverrides.orientation
      ?? (window.innerWidth < 1024 ? 'portrait' : 'landscape')
    dispatch({ type: 'HYDRATE', payload: { ...queryOverrides, orientation } })
  }, [hydrated])

  const rotateBtn = (
    <button className={`${styles.iconBtn} ${styles.iconBtnLabeled}`}
      onClick={() => dispatch({ type: 'SET_ORIENTATION', payload: state.orientation === 'landscape' ? 'portrait' : 'landscape' })}
      title={state.orientation === 'landscape' ? t('switchToPortrait') : t('switchToLandscape')}>
      {state.orientation === 'landscape' ? '▯' : '▭'} {t('rotate')}
    </button>
  )

  const centerBtn = (
    <button className={`${styles.iconBtn} ${styles.iconBtnLabeled}`}
      onClick={() => canvasRef.current?.dispatchEvent(new CustomEvent('center-overlays'))}
      title={t('centerOverlays')}>
      ⊞ {t('center')}
    </button>
  )

  const lensControls = (hideTitle?: boolean) => (
    <>
      <ToolActions toolSlug="fov-simulator"
        onReset={() => { dispatch({ type: 'RESET' }); setOverlayOffsets({}) }}
        canvasRef={canvasRef} imageFilename="fov-comparison.png" hideTitle={hideTitle} />
      {hideTitle && <div className={styles.mobileDivider} />}
      {state.lenses.map((lens, i) => (
        <LensPanel key={i} label={`Lens ${LENS_LABELS[i]}`} color={LENS_COLORS[i]} config={lens}
          isActive={state.activeLens === i} collapsed={collapsed[i] ?? false}
          onChange={(u) => {
            const key = Object.keys(u)[0]
            if (key) trackParam({ param_name: key, param_value: String(Object.values(u)[0]), input_type: 'slider' })
            dispatch({ type: 'SET_LENS', payload: { index: i, updates: u } })
          }}
          onFocus={() => dispatch({ type: 'SET_ACTIVE_LENS', payload: i })}
          onToggleCollapse={() => setCollapsed((c) => ({ ...c, [i]: !c[i] }))}
          onRemove={state.lenses.length > 1 ? () => dispatch({ type: 'REMOVE_LENS', payload: i }) : undefined} />
      ))}
      {state.lenses.length < MAX_LENSES && (
        <button className={styles.addLensBtn} onClick={() => dispatch({ type: 'ADD_LENS' })}>{t('addLens')}</button>
      )}
    </>
  )

  return (
    <div className={styles.app}>
      <ToolHeading slug="fov-simulator" />
      <div className={styles.appBody}>
        <Sidebar>{lensControls()}</Sidebar>

        <main className={styles.canvasArea}>
          <nav className={styles.canvasTopbar}>
            <ScenePicker scenes={SCENES} selectedIndex={state.imageIndex}
              onSelect={(i) => {
                dispatch({ type: 'SET_IMAGE', payload: i })
                if (i !== -1) { setSourceFocalLength(null); setExifDetected(null) }
              }}
              customSrc={customImageSrc} onCustomFile={handleCustomFile} onCustomRemove={handleCustomRemove} />
            {state.imageIndex === -1 && (
              <SourceFocalLengthPopover
                value={sourceFocalLength}
                exifDetected={exifDetected}
                onChange={setSourceFocalLength}
              />
            )}
            <span className={styles.desktopOnly}>{rotateBtn}</span>
            <span className={styles.desktopOnly}>{centerBtn}</span>
          </nav>

          <section className={styles.canvasMain}>
            <Canvas lenses={state.lenses} imageIndex={state.imageIndex} orientation={state.orientation}
              canvasRef={canvasRef} cleanCanvasRef={cleanCanvasRef} distance={state.distance}
              showGuides={state.showGuides} activeLens={state.activeLens} offsets={overlayOffsets}
              onOffsetsChange={setOverlayOffsets} customImageSrc={customImageSrc} sourceImageRef={sourceImageRef}
              sourceFocalLength={sourceFocalLength} />
          </section>

          <CropStrip lenses={state.lenses} imageIndex={state.imageIndex} orientation={state.orientation}
            activeLens={state.activeLens} onSelectLens={(i) => dispatch({ type: 'SET_ACTIVE_LENS', payload: i })}
            offsets={overlayOffsets} expanded={cropExpanded} onToggleExpand={() => setCropExpanded((v) => !v)}
            cleanCanvasRef={cleanCanvasRef} sourceImageRef={sourceImageRef}
            sourceFocalLength={sourceFocalLength} />
        </main>

        <div className={styles.desktopOnly}><LearnPanel slug="fov-simulator" /></div>
      </div>

      <div className={styles.mobileToolbar}>
        <div className={styles.mobileToolbarLeft}>
          <span className={styles.mobileLogoIcon} />
          <span className={styles.mobileLogoText}>{t('fovSimulator')}</span>
        </div>
        <div className={styles.mobileToolbarRight}>
          {rotateBtn}{centerBtn}<ThemeToggle theme={theme} onChange={setTheme} />
        </div>
      </div>

      <div className={styles.mobileControls}>{lensControls(true)}</div>
      <RelatedTools variant="inline" currentSlug="fov-simulator" />
      <div className={styles.mobileOnly}><LearnPanel slug="fov-simulator" /></div>
      <canvas ref={cleanCanvasRef} style={{ display: 'none' }} />
    </div>
  )
}

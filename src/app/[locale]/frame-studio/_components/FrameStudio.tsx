'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import * as Sentry from '@sentry/nextjs'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { DraftBanner } from '@/components/shared/DraftBanner'
import { ToolActions } from '@/components/shared/ToolActions'
import { getToolBySlug, getToolStatus } from '@/lib/data/tools'
import { ImageCanvas } from './ImageCanvas'
import { GridCanvas } from './GridCanvas'
import { CropView } from './CropView'
import { FrameSidebar } from './FrameSidebar'

// ExportDialog pulls upng-js + jpeg-js (~80KB combined) plus EXIF transfer
// helpers. The dialog is only rendered after the user clicks Export, so we
// defer the bundle until that interaction to keep the initial Frame Studio
// page lighter.
const ExportDialog = dynamic(
  () => import('./ExportDialog').then((m) => ({ default: m.ExportDialog })),
  { ssr: false },
)
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolHeading } from '@/components/shared/ToolHeading'
import type { EditorMode, GridType, GridOptions, FrameConfig, CropState, AspectRatioType } from './types'
import { DEFAULT_GRID_OPTIONS, DEFAULT_FRAME_CONFIG } from '@/lib/data/frameStudio'
import styles from './FrameStudio.module.css'

const SLUG = 'frame-studio'
const NO_FRAME_CONFIG: FrameConfig = { ...DEFAULT_FRAME_CONFIG, borderWidth: 0 }
const DEFAULT_PHOTO_URL = '/images/scenes/wildlife.jpg'

export function FrameStudio() {
  const { trackParam } = useToolSession()
  const tool = getToolBySlug(SLUG)
  const isDraft = tool ? getToolStatus(tool) === 'draft' : false

  const [mode, setMode] = useState<EditorMode>('view')
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
  const [originalMimeType, setOriginalMimeType] = useState('image/png')
  const [cropState, setCropState] = useState<CropState | null>(null)
  const [activeGrids, setActiveGrids] = useState<GridType[]>(['rule-of-thirds'])
  const [gridOffset, setGridOffset] = useState({ x: 0, y: 0 })
  const [gridOptions, setGridOptions] = useState<GridOptions>(DEFAULT_GRID_OPTIONS)
  const [frameConfig, setFrameConfig] = useState<FrameConfig>(DEFAULT_FRAME_CONFIG)
  const [canvasDims, setCanvasDims] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 })
  const [showExport, setShowExport] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('original')

  const handleFile = useCallback((file: File) => {
    setOriginalFile(file)
    setOriginalMimeType(file.type || 'image/jpeg')
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      setOriginalImage(img)
      // Decode is complete; the browser holds the bitmap on the Image
      // element, so the blob URL is no longer needed.
      URL.revokeObjectURL(url)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }, [])

  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)
  const offsetRef = useRef(gridOffset)
  offsetRef.current = gridOffset

  const handleGridPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y }
  }, [])

  const handleGridPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    setGridOffset({
      x: dragRef.current.ox + (e.clientX - dragRef.current.startX),
      y: dragRef.current.oy + (e.clientY - dragRef.current.startY),
    })
  }, [])

  const handleGridPointerUp = useCallback(() => { dragRef.current = null }, [])

  useEffect(() => {
    fetch(DEFAULT_PHOTO_URL)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], 'wildlife.jpg', { type: 'image/jpeg' })
        handleFile(file)
      })
      .catch((err) => {
        Sentry.captureException(err, { tags: { module: 'frame-studio', op: 'load-default-photo' } })
      })
  }, [handleFile])

  const handleActiveGridsChange = useCallback((grids: GridType[]) => {
    setActiveGrids(grids)
    setGridOffset({ x: 0, y: 0 })
  }, [])

  const handleResetGrid = useCallback(() => {
    setGridOffset({ x: 0, y: 0 })
  }, [])

  const handleResetEdits = useCallback(() => {
    setMode('view')
    setCropState(null)
    setActiveGrids(['rule-of-thirds'])
    setGridOptions(DEFAULT_GRID_OPTIONS)
    setGridOffset({ x: 0, y: 0 })
    setFrameConfig(DEFAULT_FRAME_CONFIG)
    setAspectRatio('original')
  }, [])

  const handleReset = useCallback(() => {
    setShowExport(false)
    handleResetEdits()
    fetch(DEFAULT_PHOTO_URL)
      .then((res) => res.blob())
      .then((blob) => handleFile(new File([blob], 'wildlife.jpg', { type: 'image/jpeg' })))
      .catch((err) => {
        Sentry.captureException(err, { tags: { module: 'frame-studio', op: 'load-default-photo' } })
      })
  }, [handleResetEdits, handleFile])

  const handleDeletePhoto = useCallback(() => {
    setOriginalFile(null)
    setOriginalImage(null)
    setShowExport(false)
    handleResetEdits()
  }, [handleResetEdits])

  const sidebarProps = {
    mode,
    onModeChange: (v: EditorMode) => { trackParam({ param_name: 'mode', param_value: v, input_type: 'button' }); setMode(v) },
    onFile: handleFile,
    aspectRatio, onRatioChange: setAspectRatio, onApplyCrop: useCallback(() => setMode('view'), []),
    frameConfig, onFrameConfigChange: setFrameConfig,
    activeGrids, onActiveGridsChange: handleActiveGridsChange,
    gridOptions, onGridOptionsChange: setGridOptions,
    originalImage, onResetGrid: handleResetGrid, onResetEdits: handleResetEdits,
    onDeletePhoto: handleDeletePhoto, onExport: () => setShowExport(true),
  }

  return (
    <>
      <ToolHeading slug={SLUG} />
      {isDraft && <DraftBanner />}
      <div className={styles.app}>
        <div className={styles.appBody}>
          <aside className={styles.sidebar}>
            <ToolActions toolSlug={SLUG} onReset={handleReset} />
            <FrameSidebar {...sidebarProps} />
          </aside>

          <main className={styles.canvasArea}>
            <section className={styles.canvasMain}>
              {originalImage ? (
                <div className={styles.canvasWrap}>
                  {mode === 'crop' ? (
                    <CropView image={originalImage} aspectRatio={aspectRatio} onCropChange={setCropState}
                      activeGrids={activeGrids} options={gridOptions} />
                  ) : (
                    <>
                      <ImageCanvas image={originalImage} crop={cropState}
                        frameConfig={mode === 'frame' ? frameConfig : NO_FRAME_CONFIG} onDimensionsChange={setCanvasDims} />
                      {activeGrids.length > 0 && canvasDims.width > 0 && (
                        <div
                          className={styles.gridOverlay}
                          style={{ left: canvasDims.offsetX, top: canvasDims.offsetY, width: canvasDims.width, height: canvasDims.height }}
                          onPointerDown={handleGridPointerDown}
                          onPointerMove={handleGridPointerMove}
                          onPointerUp={handleGridPointerUp}
                          onPointerCancel={handleGridPointerUp}
                        >
                          <GridCanvas width={canvasDims.width} height={canvasDims.height}
                            activeGrids={activeGrids} options={gridOptions} offset={gridOffset} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <span className={styles.emptyPrompt}>{/* upload prompt handled by sidebar */}</span>
              )}
            </section>
          </main>
          <div className={styles.desktopOnly}><LearnPanel slug={SLUG} /></div>
        </div>

        <div className={styles.mobileControls}>
          <div className={styles.toolsSection}>
            <ToolActions toolSlug={SLUG} onReset={handleDeletePhoto} hideTitle />
          </div>
          <div className={styles.mobileDivider} />
          <FrameSidebar {...sidebarProps} />
        </div>
      </div>
      <RelatedTools variant="inline" currentSlug="frame-studio" />
      <div className={styles.mobileOnly}><LearnPanel slug={SLUG} /></div>

      {showExport && originalImage && originalFile && (
        <ExportDialog image={originalImage} crop={cropState} frameConfig={frameConfig}
          activeGrids={activeGrids} gridOptions={gridOptions} gridOffset={gridOffset}
          gridDisplaySize={{ width: canvasDims.width, height: canvasDims.height }}
          originalFile={originalFile} originalMimeType={originalMimeType}
          onClose={() => setShowExport(false)} />
      )}
    </>
  )
}

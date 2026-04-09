'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { ToolActions } from '@/components/shared/ToolActions'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { supportsHtmlInCanvas } from '@/lib/utils/html-in-canvas'
import { V2NotSupported } from '@/components/shared/V2NotSupported'
import { ImageCanvas } from '../ImageCanvas'
import { GridCanvas } from '../GridCanvas'
import { CropView } from '../CropView'
import { TemplatePreview } from './TemplatePreview'
import { RichTextBlock } from './RichTextBlock'
import { AnnotationCanvas } from './AnnotationCanvas'
import { V2ExportDialog } from './V2ExportDialog'
import { V2Sidebar } from './V2Sidebar'
import { useV2State } from './useV2State'
import type { FrameConfig, CropState, GridType, GridOptions, AspectRatioType } from '../types'
import type { V2EditorMode } from './types'
import { DEFAULT_GRID_OPTIONS, DEFAULT_FRAME_CONFIG } from '@/lib/data/frameStudio'
import ss from '../FrameStudio.module.css'
import v2 from './FrameStudioV2.module.css'

const SLUG = 'frame-studio'
const NO_FRAME: FrameConfig = { ...DEFAULT_FRAME_CONFIG, borderWidth: 0 }
const DEFAULT_PHOTO = '/images/scenes/wildlife.jpg'

export function FrameStudioV2() {
  const { trackParam } = useToolSession()
  const [isSupported, setIsSupported] = useState<boolean | null>(null)
  useEffect(() => { setIsSupported(supportsHtmlInCanvas()) }, [])

  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
  const [originalMimeType, setOriginalMimeType] = useState('image/png')
  const [mode, setMode] = useState<V2EditorMode>('view')
  const [cropState, setCropState] = useState<CropState | null>(null)
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('original')
  const [frameConfig, setFrameConfig] = useState<FrameConfig>(DEFAULT_FRAME_CONFIG)
  const [activeGrids, setActiveGrids] = useState<GridType[]>(['rule-of-thirds'])
  const [gridOffset, setGridOffset] = useState({ x: 0, y: 0 })
  const [gridOptions, setGridOptions] = useState<GridOptions>(DEFAULT_GRID_OPTIONS)
  const [canvasDims, setCanvasDims] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 })
  const [showExport, setShowExport] = useState(false)

  const v2s = useV2State()
  const textLayerRef = useRef<HTMLDivElement>(null)
  const templateRef = useRef<HTMLDivElement>(null)

  const handleFile = useCallback((file: File) => {
    setOriginalFile(file); setOriginalMimeType(file.type || 'image/jpeg')
    const img = new Image(); img.onload = () => setOriginalImage(img); img.src = URL.createObjectURL(file)
  }, [])

  useEffect(() => {
    fetch(DEFAULT_PHOTO).then(r => r.blob())
      .then(b => handleFile(new File([b], 'wildlife.jpg', { type: 'image/jpeg' })))
      .catch(e => console.error('Failed to load default photo', e))
  }, [handleFile])

  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)
  const offsetRef = useRef(gridOffset); offsetRef.current = gridOffset
  const onGridDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y }
  }, [])
  const onGridMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    setGridOffset({ x: dragRef.current.ox + (e.clientX - dragRef.current.startX), y: dragRef.current.oy + (e.clientY - dragRef.current.startY) })
  }, [])
  const onGridUp = useCallback(() => { dragRef.current = null }, [])

  const handleActiveGridsChange = useCallback((g: GridType[]) => { setActiveGrids(g); setGridOffset({ x: 0, y: 0 }) }, [])
  const handleApplyCrop = useCallback(() => setMode('view'), [])
  const handleResetGrid = useCallback(() => setGridOffset({ x: 0, y: 0 }), [])
  const handleResetEdits = useCallback(() => {
    setMode('view'); setCropState(null); setActiveGrids(['rule-of-thirds']); setGridOptions(DEFAULT_GRID_OPTIONS)
    setGridOffset({ x: 0, y: 0 }); setFrameConfig(DEFAULT_FRAME_CONFIG); setAspectRatio('original'); v2s.resetV2()
  }, [v2s])
  const handleReset = useCallback(() => {
    setShowExport(false); handleResetEdits()
    fetch(DEFAULT_PHOTO).then(r => r.blob()).then(b => handleFile(new File([b], 'wildlife.jpg', { type: 'image/jpeg' })))
      .catch(e => console.error('Failed to load default photo', e))
  }, [handleResetEdits, handleFile])
  const handleDeletePhoto = useCallback(() => {
    setOriginalFile(null); setOriginalImage(null); setShowExport(false); handleResetEdits()
  }, [handleResetEdits])

  if (isSupported === null) return null
  if (!isSupported) return <V2NotSupported v1Href="../frame-studio" />

  const isTemplate = mode === 'template'

  const sidebarProps = {
    mode, onModeChange: (m: V2EditorMode) => { trackParam({ param_name: 'mode', param_value: m, input_type: 'button' }); setMode(m) },
    onFile: handleFile, aspectRatio, onRatioChange: setAspectRatio, onApplyCrop: handleApplyCrop,
    frameConfig, onFrameConfigChange: setFrameConfig,
    activeGrids, onActiveGridsChange: handleActiveGridsChange, gridOptions, onGridOptionsChange: setGridOptions,
    onResetGrid: handleResetGrid,
    textBlocks: v2s.textBlocks, activeTextId: v2s.activeTextId, onAddText: v2s.addText, onRemoveText: v2s.removeText, onUpdateText: v2s.updateText,
    activeTool: v2s.activeTool, onToolChange: v2s.setActiveTool, annotationColor: v2s.annotationColor, onAnnotationColorChange: v2s.setAnnotationColor,
    annotationStrokeWidth: v2s.annotationStrokeWidth, onAnnotationStrokeWidthChange: v2s.setAnnotationStrokeWidth,
    annotations: v2s.annotations, onAnnotationUndo: v2s.undoAnnotation, onAnnotationClear: v2s.clearAnnotations,
    templateConfig: v2s.templateConfig, onTemplateChange: v2s.setTemplateConfig,
    originalImage, onResetEdits: handleResetEdits, onDeletePhoto: handleDeletePhoto, onExport: () => setShowExport(true),
  }

  return (
    <>
      <div className={ss.app}>
        <div className={ss.appBody}>
          <aside className={ss.sidebar}>
            <ToolActions toolSlug={SLUG} onReset={handleReset} />
            <V2Sidebar {...sidebarProps} />
          </aside>
          <main className={ss.canvasArea}>
            <section className={ss.canvasMain}>
              {originalImage ? (
                <div className={ss.canvasWrap}>
                  {mode === 'crop' ? (
                    <CropView image={originalImage} aspectRatio={aspectRatio} onCropChange={setCropState}
                      activeGrids={activeGrids} options={gridOptions} />
                  ) : isTemplate ? (
                    <TemplatePreview image={originalImage} config={v2s.templateConfig} crop={cropState} />
                  ) : (
                    <>
                      <ImageCanvas image={originalImage} crop={cropState}
                        frameConfig={mode === 'frame' ? frameConfig : NO_FRAME} onDimensionsChange={setCanvasDims} />
                      {activeGrids.length > 0 && canvasDims.width > 0 && (
                        <div className={ss.gridOverlay}
                          style={{ left: canvasDims.offsetX, top: canvasDims.offsetY, width: canvasDims.width, height: canvasDims.height }}
                          onPointerDown={onGridDown} onPointerMove={onGridMove} onPointerUp={onGridUp} onPointerCancel={onGridUp}>
                          <GridCanvas width={canvasDims.width} height={canvasDims.height}
                            activeGrids={activeGrids} options={gridOptions} offset={gridOffset} />
                        </div>
                      )}
                      <div ref={textLayerRef}
                        className={`${v2.textLayer} ${mode === 'text' ? v2.interactive : ''}`}
                        style={{ left: canvasDims.offsetX, top: canvasDims.offsetY, width: canvasDims.width, height: canvasDims.height, position: 'absolute' }}
                        onPointerDown={() => { if (mode === 'text') v2s.setActiveTextId(null) }}>
                        {v2s.textBlocks.map(b => (
                          <RichTextBlock key={b.id} config={b} isActive={b.id === v2s.activeTextId}
                            onSelect={v2s.setActiveTextId} onContentChange={() => {}} />
                        ))}
                      </div>
                      {canvasDims.width > 0 && (
                        <div className={`${v2.annotationLayer} ${mode === 'annotate' ? v2.interactive : ''}`}
                          style={{ left: canvasDims.offsetX, top: canvasDims.offsetY, position: 'absolute' }}>
                          <AnnotationCanvas width={canvasDims.width} height={canvasDims.height}
                            shapes={v2s.annotations} activeTool={mode === 'annotate' ? v2s.activeTool : null}
                            color={v2s.annotationColor} strokeWidth={v2s.annotationStrokeWidth} onAdd={v2s.addAnnotation} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : <span className={ss.emptyPrompt} />}
            </section>
          </main>
          <div className={ss.desktopOnly}><LearnPanel slug={SLUG} /></div>
        </div>
        <div className={ss.mobileControls}>
          <div className={ss.toolsSection}><ToolActions toolSlug={SLUG} onReset={handleDeletePhoto} hideTitle /></div>
          <div className={ss.mobileDivider} />
          <V2Sidebar {...sidebarProps} />
        </div>
      </div>
      <div className={ss.mobileOnly}><LearnPanel slug={SLUG} /></div>
      {showExport && originalImage && originalFile && (
        <V2ExportDialog image={originalImage} crop={cropState} frameConfig={frameConfig}
          annotations={v2s.annotations} templateConfig={v2s.templateConfig}
          textLayerRef={textLayerRef} templateRef={templateRef}
          originalFile={originalFile} originalMimeType={originalMimeType}
          mode={isTemplate ? 'template' : 'standard'} onClose={() => setShowExport(false)} />
      )}
    </>
  )
}

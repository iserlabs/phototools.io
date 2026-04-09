'use client'

import { useTranslations } from 'next-intl'
import { FileDropZone } from '@/components/shared/FileDropZone'
import { ModeToggle } from '@/components/shared/ModeToggle'
import { CropPanel } from '../CropPanel'
import { FramePanel } from '../FramePanel'
import { GridControls } from '../GridControls'
import { TextToolbar } from './TextToolbar'
import { AnnotationToolbar } from './AnnotationToolbar'
import { TemplatePanel } from './TemplatePanel'
import type { V2EditorMode, TextBlockConfig, AnnotationTool, AnnotationShape, TemplateConfig } from './types'
import type { GridType, GridOptions, FrameConfig, AspectRatioType } from '../types'
import styles from './V2Sidebar.module.css'

const V2_MODE_KEYS: { value: V2EditorMode; key: string }[] = [
  { value: 'view', key: 'modeView' },
  { value: 'crop', key: 'modeCrop' },
  { value: 'frame', key: 'modeFrame' },
  { value: 'text', key: 'modeText' },
  { value: 'annotate', key: 'modeAnnotate' },
  { value: 'template', key: 'modeTemplate' },
]

interface V2SidebarProps {
  mode: V2EditorMode
  onModeChange: (m: V2EditorMode) => void
  onFile: (f: File) => void
  /* crop */
  aspectRatio: AspectRatioType
  onRatioChange: (r: AspectRatioType) => void
  onApplyCrop: () => void
  /* frame */
  frameConfig: FrameConfig
  onFrameConfigChange: (c: FrameConfig) => void
  /* grid */
  activeGrids: GridType[]
  onActiveGridsChange: (g: GridType[]) => void
  gridOptions: GridOptions
  onGridOptionsChange: (o: GridOptions) => void
  onResetGrid: () => void
  /* text */
  textBlocks: TextBlockConfig[]
  activeTextId: string | null
  onAddText: () => void
  onRemoveText: (id: string) => void
  onUpdateText: (id: string, updates: Partial<TextBlockConfig>) => void
  /* annotate */
  activeTool: AnnotationTool | null
  onToolChange: (tool: AnnotationTool | null) => void
  annotationColor: string
  onAnnotationColorChange: (c: string) => void
  annotationStrokeWidth: number
  onAnnotationStrokeWidthChange: (w: number) => void
  annotations: AnnotationShape[]
  onAnnotationUndo: () => void
  onAnnotationClear: () => void
  /* template */
  templateConfig: TemplateConfig
  onTemplateChange: (c: TemplateConfig) => void
  /* actions */
  originalImage: HTMLImageElement | null
  onResetEdits: () => void
  onDeletePhoto: () => void
  onExport: () => void
}

export function V2Sidebar(props: V2SidebarProps) {
  const t = useTranslations('toolUI.frame-studio')
  const modeOptions = V2_MODE_KEYS.map((m) => ({ value: m.value, label: t(m.key) }))

  return (
    <div className={styles.sidebarContent}>
      <div className={styles.photoSection}>
        <span className={styles.heading}>{t('photo')}</span>
        <FileDropZone onFile={props.onFile} prompt={t('dropPrompt')} />
      </div>

      <div className={styles.modeSection}>
        <ModeToggle options={modeOptions} value={props.mode} onChange={props.onModeChange} title={t('mode')} />
      </div>

      {props.mode === 'crop' && (
        <div className={styles.modePanel}>
          <CropPanel selectedRatio={props.aspectRatio} onRatioChange={props.onRatioChange} onApply={props.onApplyCrop} />
        </div>
      )}
      {props.mode === 'frame' && (
        <div className={styles.modePanel}>
          <FramePanel config={props.frameConfig} onChange={props.onFrameConfigChange} />
        </div>
      )}
      {props.mode === 'text' && (
        <div className={styles.modePanel}>
          <TextToolbar overlays={props.textBlocks} activeId={props.activeTextId}
            onAdd={props.onAddText} onRemove={props.onRemoveText} onUpdate={props.onUpdateText} editor={null} />
        </div>
      )}
      {props.mode === 'annotate' && (
        <div className={styles.modePanel}>
          <AnnotationToolbar activeTool={props.activeTool} onToolChange={props.onToolChange}
            color={props.annotationColor} onColorChange={props.onAnnotationColorChange}
            strokeWidth={props.annotationStrokeWidth} onStrokeWidthChange={props.onAnnotationStrokeWidthChange}
            shapes={props.annotations} onUndo={props.onAnnotationUndo} onClear={props.onAnnotationClear} />
        </div>
      )}
      {props.mode === 'template' && (
        <div className={styles.modePanel}>
          <TemplatePanel config={props.templateConfig} onChange={props.onTemplateChange} />
        </div>
      )}

      <div className={styles.gridSection}>
        <GridControls activeGrids={props.activeGrids} onActiveGridsChange={props.onActiveGridsChange}
          options={props.gridOptions} onOptionsChange={props.onGridOptionsChange} onResetGrid={props.onResetGrid} />
      </div>

      {props.originalImage && (
        <div className={styles.actionGroup}>
          <div className={styles.actionRow}>
            <button className={styles.secondaryBtn} onClick={props.onResetEdits}>{t('resetPhoto')}</button>
            <button className={styles.dangerBtn} onClick={props.onDeletePhoto}>{t('deletePhoto')}</button>
          </div>
          <button className={styles.exportBtn} onClick={props.onExport}>{t('export')}</button>
        </div>
      )}
    </div>
  )
}

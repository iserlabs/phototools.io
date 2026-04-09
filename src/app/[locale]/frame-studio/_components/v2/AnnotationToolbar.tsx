'use client'

import { useTranslations } from 'next-intl'
import type { AnnotationTool, AnnotationShape } from './types'
import { ANNOTATION_TOOLS } from './types'
import s from './AnnotationToolbar.module.css'

interface AnnotationToolbarProps {
  activeTool: AnnotationTool | null
  onToolChange: (tool: AnnotationTool | null) => void
  color: string
  onColorChange: (color: string) => void
  strokeWidth: number
  onStrokeWidthChange: (w: number) => void
  shapes: AnnotationShape[]
  onUndo: () => void
  onClear: () => void
}

const TOOL_KEYS: Record<AnnotationTool, string> = {
  arrow: 'toolArrow',
  circle: 'toolCircle',
  rect: 'toolRect',
  highlight: 'toolHighlight',
  callout: 'toolCallout',
}

export function AnnotationToolbar({
  activeTool, onToolChange, color, onColorChange,
  strokeWidth, onStrokeWidthChange, shapes, onUndo, onClear,
}: AnnotationToolbarProps) {
  const t = useTranslations('toolUI.frame-studio')
  const hasShapes = shapes.length > 0

  return (
    <div className={s.panel}>
      {/* Tool selector */}
      <div className={s.field}>
        <span className={s.fieldLabel}>{t('annotationTool')}</span>
        <div className={s.toolGrid}>
          {ANNOTATION_TOOLS.map((tool) => (
            <button
              key={tool.id}
              className={`${s.toolBtn} ${activeTool === tool.id ? s.active : ''}`}
              onClick={() => onToolChange(activeTool === tool.id ? null : tool.id)}
            >
              {t(TOOL_KEYS[tool.id])}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div className={s.field}>
        <span className={s.fieldLabel}>{t('strokeColor')}</span>
        <input
          className={s.colorInput}
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
        />
      </div>

      {/* Stroke width */}
      <div className={s.field}>
        <span className={s.fieldLabel}>{t('strokeWidth')}</span>
        <input
          className={s.slider}
          type="range"
          min={1}
          max={8}
          step={1}
          value={strokeWidth}
          onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
        />
        <span className={s.fieldValue}>{strokeWidth}px</span>
      </div>

      {/* Actions */}
      <div className={s.actions}>
        <button className={s.undoBtn} disabled={!hasShapes} onClick={onUndo}>
          {t('undo')}
        </button>
        <button className={s.clearBtn} disabled={!hasShapes} onClick={onClear}>
          {t('clearAll')}
        </button>
      </div>
    </div>
  )
}

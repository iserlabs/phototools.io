'use client'

import { useState, useCallback } from 'react'
import type { TextBlockConfig, AnnotationShape, AnnotationTool, TemplateConfig } from './types'
import { DEFAULT_TEXT_BLOCK, DEFAULT_TEMPLATE_CONFIG } from './types'

export function useV2State() {
  const [textBlocks, setTextBlocks] = useState<TextBlockConfig[]>([])
  const [activeTextId, setActiveTextId] = useState<string | null>(null)
  const [annotations, setAnnotations] = useState<AnnotationShape[]>([])
  const [activeTool, setActiveTool] = useState<AnnotationTool | null>(null)
  const [annotationColor, setAnnotationColor] = useState('#ff0000')
  const [annotationStrokeWidth, setAnnotationStrokeWidth] = useState(3)
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig>(DEFAULT_TEMPLATE_CONFIG)

  const addText = useCallback(() => {
    const id = `txt_${Date.now()}`
    setTextBlocks(prev => [...prev, { ...DEFAULT_TEXT_BLOCK, id }])
    setActiveTextId(id)
  }, [])

  const removeText = useCallback((id: string) => {
    setTextBlocks(prev => prev.filter(b => b.id !== id))
    setActiveTextId(prev => prev === id ? null : prev)
  }, [])

  const updateText = useCallback((id: string, u: Partial<TextBlockConfig>) => {
    setTextBlocks(prev => prev.map(b => b.id === id ? { ...b, ...u } : b))
  }, [])

  const addAnnotation = useCallback((s: AnnotationShape) => { setAnnotations(prev => [...prev, s]) }, [])
  const undoAnnotation = useCallback(() => { setAnnotations(prev => prev.slice(0, -1)) }, [])
  const clearAnnotations = useCallback(() => { setAnnotations([]) }, [])

  const resetV2 = useCallback(() => {
    setTextBlocks([]); setActiveTextId(null)
    setAnnotations([]); setActiveTool(null)
    setTemplateConfig(DEFAULT_TEMPLATE_CONFIG)
  }, [])

  return {
    textBlocks, activeTextId, setActiveTextId,
    annotations, activeTool, setActiveTool,
    annotationColor, setAnnotationColor,
    annotationStrokeWidth, setAnnotationStrokeWidth,
    templateConfig, setTemplateConfig,
    addText, removeText, updateText,
    addAnnotation, undoAnnotation, clearAnnotations,
    resetV2,
  }
}

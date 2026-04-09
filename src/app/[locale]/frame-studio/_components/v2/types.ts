export interface TextBlockConfig {
  id: string
  x: number
  y: number
  fontFamily: string
  fontSize: number
  color: string
  opacity: number
  textShadow: string
  letterSpacing: number
  textAlign: 'left' | 'center' | 'right'
  maxWidth: number
}

export type AnnotationTool = 'arrow' | 'circle' | 'rect' | 'highlight' | 'callout'

export interface AnnotationShape {
  id: string
  tool: AnnotationTool
  x1: number; y1: number
  x2: number; y2: number
  color: string
  strokeWidth: number
  opacity: number
  calloutText?: string
}

export type V2EditorMode = 'view' | 'crop' | 'frame' | 'text' | 'annotate' | 'template'

export interface TemplateConfig {
  templateId: string | null
  title: string
  subtitle: string
  gradientFrom: string
  gradientTo: string
  textColor: string
}

export const DEFAULT_TEXT_BLOCK: Omit<TextBlockConfig, 'id'> = {
  x: 50, y: 90,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 24, color: '#ffffff', opacity: 0.9,
  textShadow: '0 1px 3px rgba(0,0,0,0.6)',
  letterSpacing: 0, textAlign: 'center', maxWidth: 80,
}

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  templateId: null, title: '', subtitle: '',
  gradientFrom: 'rgba(0,0,0,0)', gradientTo: 'rgba(0,0,0,0.7)', textColor: '#ffffff',
}

export const FONT_OPTIONS = [
  { id: 'inter', value: 'Inter, system-ui, sans-serif', label: 'Inter' },
  { id: 'georgia', value: 'Georgia, serif', label: 'Georgia' },
  { id: 'mono', value: 'ui-monospace, monospace', label: 'Monospace' },
  { id: 'system', value: 'system-ui, sans-serif', label: 'System' },
] as const

export const SHADOW_PRESETS = [
  { id: 'none', value: 'none', label: 'None' },
  { id: 'subtle', value: '0 1px 3px rgba(0,0,0,0.6)', label: 'Subtle' },
  { id: 'strong', value: '0 2px 8px rgba(0,0,0,0.8)', label: 'Strong' },
  { id: 'glow', value: '0 0 12px rgba(255,255,255,0.5)', label: 'Glow' },
] as const

export const ANNOTATION_TOOLS: { id: AnnotationTool; label: string }[] = [
  { id: 'arrow', label: 'Arrow' },
  { id: 'circle', label: 'Circle' },
  { id: 'rect', label: 'Rectangle' },
  { id: 'highlight', label: 'Highlight' },
  { id: 'callout', label: 'Callout' },
]

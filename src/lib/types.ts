export interface SensorPreset {
  id: string
  name: string
  cropFactor: number
  w?: number
  h?: number
  color?: string
}

export interface FocalLengthPreset {
  value: number
  label: string | null
}

export interface LensConfig {
  focalLength: number
  sensorId: string
}

export type ToolStatus = 'live' | 'draft' | 'disabled'
export type ToolCategory = 'calculator' | 'visualizer' | 'reference' | 'file-tool'

export interface ToolDef {
  slug: string
  name: string
  description: string
  dev: ToolStatus
  prod: ToolStatus
  category: ToolCategory
}

export type UnitSystem = 'metric' | 'imperial'

export interface AspectRatio {
  id: string       // '3x2' (url-safe)
  label: string    // '3:2'
  w: number
  h: number
}

export interface MegapixelPreset {
  id: string       // 'mp_24'
  mp: number
  name: string     // '24 MP'
  models?: string
  tag: 'phone' | 'mf' | 'ff' | 'apsc' | 'm43' | 'extreme'
  color: string
}

export interface CustomMegapixel {
  id: string
  name: string
  mp: number
  aspectOverride?: string   // aspectId or undefined to follow global
  color: string
}

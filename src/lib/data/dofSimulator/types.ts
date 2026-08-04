import type { CropLevel } from '@/lib/math/projection'
import type { BokehShapeId } from '@/lib/math/bokehKernel'

export interface DofCamera {
  id: string
  brand: string
  model: string
  sensorId: string
}

export interface DofLens {
  id: string
  brand: string
  model: string
  flMin: number
  flMax: number // mm
  apMaxWide: number
  apMaxTele: number // widest f-number at flMin / flMax
  apMin: number // narrowest f-number (e.g. 16 or 22)
  minFocusM?: number // minimum focus distance, meters
}

export type TeleconverterId = 'none' | 'tc14' | 'tc20'

export interface Teleconverter {
  id: TeleconverterId
  flFactor: number
  stopsLost: number
}

export interface SubjectSlice {
  src: string
  depthOffsetMm: number // negative = toward camera
}

export interface SubjectCrop {
  src: string
  assetPxHeight: number
  eyeLineRatio: number
  slices: SubjectSlice[]
}

export interface DofSubject {
  id: string
  name: string
  heightM: number
  crops: Record<CropLevel, SubjectCrop>
}

export interface DofBackground {
  id: string
  name: string
  distanceM: number
  srcLandscape: string
  srcPortrait: string
  highlightRich: boolean
}

export interface FramingPresetDef {
  key: 'face' | 'portrait' | 'medium' | 'american' | 'full'
  frameHeightMm: number
}

export type { BokehShapeId, CropLevel }

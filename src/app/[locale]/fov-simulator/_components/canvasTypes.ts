import type { LensConfig } from '@/lib/types'

interface PillBounds {
  x: number
  y: number
  w: number
  h: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
  color: string
  label: string
  index: number
  focalLength: number
  fov: { horizontal: number; vertical: number }
  pill?: PillBounds
}

export type OverlayOffsets = Record<number, { dx: number; dy: number }>

export interface CanvasProps {
  lenses: LensConfig[]
  imageIndex: number
  orientation: 'landscape' | 'portrait'
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  cleanCanvasRef: React.RefObject<HTMLCanvasElement | null>
  distance: number
  showGuides: boolean
  activeLens: number
  offsets: OverlayOffsets
  onOffsetsChange: React.Dispatch<React.SetStateAction<OverlayOffsets>>
  customImageSrc?: string | null
  sourceImageRef?: React.MutableRefObject<HTMLImageElement | null>
}

export const FRAMING_GUIDES = [
  { label: 'full body', height: 5.5 },
  { label: 'waist up', height: 3.0 },
  { label: 'head & shoulders', height: 1.5 },
  { label: 'headshot', height: 0.8 },
]

export const MIN_HIT_SIZE = 30

import type { UnitSystem, CustomMegapixel } from '@/lib/types'
import type { ViewingDistance, BitDepth } from '@/lib/math/megapixel'

export type DisplayMode = 'overlay' | 'side-by-side'

export const ANIM_DURATION = 300

export const STORAGE_KEY = 'phototools:custom-megapixels'
export const STORAGE_VERSION = 1

/** Fixed DPI used by overlay/side-by-side rectangle sizing. */
export const FIXED_DPI = 300

export type StoredCustomMegapixels = {
  v: number
  entries: CustomMegapixel[]
}

export type MegapixelControlsProps = {
  visible: Set<string>
  mode: DisplayMode
  aspectId: string
  units: UnitSystem
  customMps: CustomMegapixel[]
  onToggleMp: (id: string) => void
  onModeChange: (m: DisplayMode) => void
  onAspectChange: (id: string) => void
  onUnitsChange: (u: UnitSystem) => void
  onAddCustomMp: (name: string, mp: number) => void
  onRemoveCustomMp: (id: string) => void
  onRemoveAllCustom: () => void
}

export type PrintTableControlsProps = {
  viewingDistance: ViewingDistance
  bitDepth: BitDepth
  onViewingDistanceChange: (d: ViewingDistance) => void
  onBitDepthChange: (b: BitDepth) => void
}

export { type UnitSystem, type CustomMegapixel, type ViewingDistance, type BitDepth }

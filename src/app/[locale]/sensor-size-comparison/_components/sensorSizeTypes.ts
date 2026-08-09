import type { SensorPreset } from '@/lib/types'
import { CUSTOM_ENTRY_COLORS } from '@/lib/data/colors'

export type DisplayMode = 'overlay' | 'side-by-side' | 'pixel-density'

/**
 * A sensor ready for rendering: every field is guaranteed present except
 * `group`, which stays optional since user-created custom sensors never
 * have one (only curated `SENSORS` presets do).
 */
export type ResolvedSensor = Omit<Required<SensorPreset>, 'group'> & Pick<SensorPreset, 'group'>

/**
 * A user-created custom sensor. Built on `ResolvedSensor` (not the raw
 * `SensorPreset`) so it stays structurally interchangeable with every
 * component that already renders `ResolvedSensor[]`. `mp` lives on the
 * object itself — it is never written into the shared `COMMON_MP` module
 * data, which must stay free of per-session user state.
 */
export type CustomSensor = ResolvedSensor & { mp?: number }

export type SensorRect = { id: string; x: number; y: number; w: number; h: number; sensorW: number; sensorH: number; color: string }

export type StoredCustomSensor = { id: string; name: string; w: number; h: number; cropFactor: number; color: string; mp?: number }

export const CUSTOM_COLORS = CUSTOM_ENTRY_COLORS

export const ANIM_DURATION = 300

export const DEFAULT_VISIBLE_IDS = ['mf', 'ff', 'apsc_n', 'm43', 'phone']
export const DEFAULT_VISIBLE = DEFAULT_VISIBLE_IDS.join('+')

export const STORAGE_KEY = 'phototools:custom-sensors'

export type ControlsPanelProps = {
  visible: Set<string>
  mode: DisplayMode
  customSensors: CustomSensor[]
  onToggleSensor: (id: string) => void
  onModeChange: (m: DisplayMode) => void
  onAddCustom: (name: string, w: number, h: number, mp: number) => void
  onRemoveCustom: (id: string) => void
  onRemoveAllCustom: () => void
  onEditCustom: (id: string, name: string, w: number, h: number, mp: number) => void
}

import { SENSORS } from '@/lib/data/sensors'
import type { SensorPreset } from '@/lib/types'

/** Named phone main-camera presets — tool-local so shared SENSORS (used by other tools) is untouched. */
export const PHONE_SENSORS: SensorPreset[] = [
  { id: 'iphone16pro', name: 'iPhone 16 Pro (main)', cropFactor: 3.67, w: 9.8, h: 7.3, color: '#64748b' },
  { id: 'pixel9pro', name: 'Pixel 9 Pro (main)', cropFactor: 3.7, w: 9.7, h: 7.3, color: '#94a3b8' },
]

export const DOF_SENSORS: SensorPreset[] = [...SENSORS, ...PHONE_SENSORS]

// Full-frame is the sane fallback when an id doesn't resolve (bad/legacy query
// param, deleted preset). Looked up by id, not a positional index into the
// shared SENSORS array -- other tools also read that array, so an insert
// above index 3 must not silently change this tool's fallback.
const FALLBACK_SENSOR_ID = 'ff'

export function getDofSensor(id: string): SensorPreset {
  return (
    DOF_SENSORS.find((s) => s.id === id) ??
    DOF_SENSORS.find((s) => s.id === FALLBACK_SENSOR_ID) ??
    DOF_SENSORS[0]
  )
}

export function sensorAspect(s: SensorPreset): number {
  return (s.w ?? 36) / (s.h ?? 24)
}

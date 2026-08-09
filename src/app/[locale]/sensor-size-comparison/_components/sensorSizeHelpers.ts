import { ALL_SENSORS, SENSOR_GROUP_ORDER, calcCropFactor } from '@/lib/data/sensors'
import { CUSTOM_COLORS, STORAGE_KEY } from './sensorSizeTypes'
import type { StoredCustomSensor, CustomSensor, ResolvedSensor } from './sensorSizeTypes'

export let customColorIdx = 0
export function setCustomColorIdx(n: number) { customColorIdx = n }

export const ALL_SENSOR_ID_SET = new Set(ALL_SENSORS.map((s) => s.id))

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff},${a})`
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

export function easeOut(t: number): number {
  return 1 - (1 - t) ** 3
}

/**
 * Sort sensors for canvas rendering: `SENSOR_GROUP_ORDER` first (custom
 * sensors, which have no `group`, sort after every curated group), then by
 * area descending within a group. Keeps side-by-side/pixel-density columns
 * and overlay ordering visually grouped instead of following whatever order
 * `allSensors` happened to be built in.
 */
export function orderForRender(sensors: ResolvedSensor[]): ResolvedSensor[] {
  return [...sensors].sort((a, b) => {
    const aIdx = a.group ? SENSOR_GROUP_ORDER.indexOf(a.group) : SENSOR_GROUP_ORDER.length
    const bIdx = b.group ? SENSOR_GROUP_ORDER.indexOf(b.group) : SENSOR_GROUP_ORDER.length
    if (aIdx !== bIdx) return aIdx - bIdx
    return b.w * b.h - a.w * a.h
  })
}

export function encodeCustomParam(sensors: CustomSensor[]): string {
  return sensors.map(s => {
    const mp = s.mp ?? 0
    return `${s.name}~${s.w}~${s.h}~${mp}`
  }).join(',')
}

export function decodeCustomParam(raw: string): CustomSensor[] {
  if (!raw) return []
  return raw.split(',').map((entry, i) => {
    const [name, ws, hs, mps] = entry.split('~')
    const w = parseFloat(ws)
    const h = parseFloat(hs)
    const mp = parseFloat(mps) || 0
    if (!name || isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null
    const id = `custom_url_${i}`
    const color = CUSTOM_COLORS[i % CUSTOM_COLORS.length]
    const cropFactor = calcCropFactor(w, h)
    return { id, name, w, h, cropFactor, color, mp } as CustomSensor
  }).filter(Boolean) as CustomSensor[]
}

export function loadCustomSensors(): CustomSensor[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const stored = parsed as StoredCustomSensor[]
    customColorIdx = stored.length
    return stored.map(s => ({
      id: s.id, name: s.name, w: s.w, h: s.h, cropFactor: s.cropFactor, color: s.color,
      mp: s.mp,
    }))
  } catch { return [] }
}

export function saveCustomSensors(sensors: CustomSensor[]) {
  try {
    const stored: StoredCustomSensor[] = sensors.map(s => ({
      id: s.id, name: s.name, w: s.w, h: s.h, cropFactor: s.cropFactor, color: s.color,
      mp: s.mp,
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch { /* ignore */ }
}

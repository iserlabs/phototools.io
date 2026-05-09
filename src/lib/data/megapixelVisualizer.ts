import type { MegapixelPreset } from '@/lib/types'
import { COMMON_MP, type MpEntry } from './sensors'

const CURATED_MP_ORDER: number[] = [
  8, 12, 16, 20, 24, 26, 33, 36, 42, 45, 50, 61, 100, 150, 200,
]

const MP_COLOR_BY_INDEX = [
  '#64748b', '#475569', '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899',
]

function tagForMp(mp: number): MegapixelPreset['tag'] {
  if (mp === 48 || mp === 50 || mp === 108 || mp === 200) return 'phone'
  if (mp >= 150) return 'extreme'
  if (mp >= 50) return 'mf'
  return 'ff'
}

function collectModels(): Map<number, string[]> {
  const map = new Map<number, string[]>()
  for (const entries of Object.values(COMMON_MP)) {
    for (const { mp, models } of entries as MpEntry[]) {
      const list = map.get(mp) ?? []
      if (models && !list.includes(models)) list.push(models)
      map.set(mp, list)
    }
  }
  return map
}

/**
 * MP presets derived from COMMON_MP at module load.
 * Custom sensors added at runtime in the sensor tool do NOT leak into this list —
 * the snapshot is taken once at import time.
 */
export const MP_PRESETS: MegapixelPreset[] = (() => {
  const modelMap = collectModels()
  return CURATED_MP_ORDER.map((mp, idx) => ({
    id: `mp_${mp}`,
    mp,
    name: `${mp} MP`,
    models: (modelMap.get(mp) ?? []).join(' · ') || undefined,
    tag: tagForMp(mp),
    color: MP_COLOR_BY_INDEX[idx % MP_COLOR_BY_INDEX.length],
  }))
})()

export const ALL_MP_ID_SET = new Set(MP_PRESETS.map(m => m.id))
export const DEFAULT_VISIBLE_MP_IDS = ['mp_12', 'mp_24', 'mp_45', 'mp_100']

/** Advertised MP → typical output after pixel binning. */
export const PHONE_BINNING: Record<number, number> = {
  48: 12, 50: 12, 108: 12, 200: 12,
}

export const DPI_PRESETS = [
  { value: 72,  id: 'web' },
  { value: 150, id: 'magazine' },
  { value: 240, id: 'good-print' },
  { value: 300, id: 'fine-art' },
] as const

export const BIT_DEPTHS = [
  { id: 'jpeg8',  bytesPerPixel: 0.3 },
  { id: 'raw14',  bytesPerPixel: 1.75 },
  { id: 'tiff16', bytesPerPixel: 6 },
] as const

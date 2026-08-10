import type { BokehShapeId } from '@/lib/data/dofSimulator/types'

// Pure, storage-injected saved-settings store. Storage is injected (rather
// than reading `window.localStorage` directly) so this module stays testable
// with a plain in-memory stub — no jsdom/browser globals required. The hook
// (useSavedSettings.ts) owns guarding actual `window.localStorage` access.

export interface SavedRow {
  id: string // crypto.randomUUID()
  cameraLabel: string // e.g. "Full Frame" or "Nikon Z8"
  focalLength: number
  aperture: number
  distanceM: number
  bokeh: BokehShapeId
}

export const SAVED_KEY = 'phototools.dof.saved.v1'
export const SAVED_CAP = 20

interface StoredPayload {
  v: 1
  rows: SavedRow[]
}

/** Loads saved rows from storage. Returns [] on missing/corrupt/version-mismatched data. */
export function loadRows(storage: Pick<Storage, 'getItem'>): SavedRow[] {
  try {
    const raw = storage.getItem(SAVED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Partial<StoredPayload>
    if (parsed.v !== 1 || !Array.isArray(parsed.rows)) return []
    return parsed.rows
  } catch {
    return []
  }
}

/** Persists rows to storage. Returns false (never throws) on quota/error. */
export function persistRows(storage: Pick<Storage, 'setItem'>, rows: SavedRow[]): boolean {
  try {
    const payload: StoredPayload = { v: 1, rows }
    storage.setItem(SAVED_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

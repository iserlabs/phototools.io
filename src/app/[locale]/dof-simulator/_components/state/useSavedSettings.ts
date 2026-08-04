'use client'

import { useCallback, useEffect, useState } from 'react'
import { loadRows, persistRows, SAVED_CAP, type SavedRow } from './savedSettingsStore'

export interface SavedSettingsApi {
  rows: SavedRow[]
  addRow(row: Omit<SavedRow, 'id'>): void // prepends; drops overflow past SAVED_CAP
  removeRow(id: string): void
  sortBy(key: SortKey): void
}

type SortKey = 'cameraLabel' | 'focalLength' | 'aperture' | 'distanceM'

// Static default; SSR and client both get this. After client mount, the
// first effect reads from storage — see the hydration-safety convention
// established in useUiPrefs.ts (never read storage in the lazy initializer).
const DEFAULT_ROWS: SavedRow[] = []

// `window.localStorage` property access itself can throw a SecurityError
// (Safari "Block All Cookies"), so the property read sits inside the try,
// not just the method calls (mirrors src/lib/utils/safe-storage.ts).
function getStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function useSavedSettings(): SavedSettingsApi {
  const [rows, setRows] = useState<SavedRow[]>(DEFAULT_ROWS)
  const [hydrated, setHydrated] = useState(false)
  const [inMemory, setInMemory] = useState(false)

  // Read from storage on mount (client-side only).
  useEffect(() => {
    const storage = getStorage()
    if (storage) {
      setRows(loadRows(storage))
    } else {
      setInMemory(true)
    }
    setHydrated(true)
  }, [])

  // Persist to storage whenever rows change, but only after hydration.
  // If persistence ever fails (quota, storage blocked), stop trying and
  // fall back to running purely in-memory for the rest of the session.
  useEffect(() => {
    if (!hydrated || inMemory) return
    const storage = getStorage()
    if (!storage || !persistRows(storage, rows)) {
      setInMemory(true)
    }
  }, [rows, hydrated, inMemory])

  const addRow = useCallback((row: Omit<SavedRow, 'id'>) => {
    setRows((prev) => [{ ...row, id: crypto.randomUUID() }, ...prev].slice(0, SAVED_CAP))
  }, [])

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const sortBy = useCallback((key: SortKey) => {
    setRows((prev) => {
      const sorted = [...prev]
      sorted.sort((a, b) => {
        const av = a[key]
        const bv = b[key]
        if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv)
        return (av as number) - (bv as number)
      })
      return sorted
    })
  }, [])

  return { rows, addRow, removeRow, sortBy }
}

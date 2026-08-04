'use client'

import { useCallback, useState, useEffect } from 'react'
import { safeStorageGet, safeStorageSet } from '@/lib/utils/safe-storage'

export interface UiPrefsApi {
  advanced: boolean
  imperial: boolean
  setAdvanced(v: boolean): void
  setImperial(v: boolean): void
}

interface StoredUiPrefs {
  advanced: boolean
  imperial: boolean
}

const STORAGE_KEY = 'phototools.dof.uiprefs.v1'
const DEFAULT_PREFS: StoredUiPrefs = { advanced: false, imperial: false }

export function useUiPrefs(): UiPrefsApi {
  // Start with static defaults; SSR and client both get these.
  // After client mount, the first effect reads from storage.
  const [prefs, setPrefs] = useState<StoredUiPrefs>(DEFAULT_PREFS)
  const [hydrated, setHydrated] = useState(false)

  // Read from storage on mount (client-side only).
  useEffect(() => {
    const raw = safeStorageGet(STORAGE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<StoredUiPrefs>
        setPrefs({
          advanced: typeof parsed.advanced === 'boolean' ? parsed.advanced : DEFAULT_PREFS.advanced,
          imperial: typeof parsed.imperial === 'boolean' ? parsed.imperial : DEFAULT_PREFS.imperial,
        })
      } catch {
        // Corrupted JSON: fall back to defaults.
        setPrefs(DEFAULT_PREFS)
      }
    }
    setHydrated(true)
  }, [])

  // Persist to storage whenever prefs change, but only after hydration.
  useEffect(() => {
    if (!hydrated) return
    safeStorageSet(STORAGE_KEY, JSON.stringify(prefs))
  }, [prefs, hydrated])

  const setAdvanced = useCallback((v: boolean) => {
    setPrefs((prev) => ({ ...prev, advanced: v }))
  }, [])

  const setImperial = useCallback((v: boolean) => {
    setPrefs((prev) => ({ ...prev, imperial: v }))
  }, [])

  return { advanced: prefs.advanced, imperial: prefs.imperial, setAdvanced, setImperial }
}

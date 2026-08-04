'use client'

import { useCallback, useState } from 'react'

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

function readPrefs(): StoredUiPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw) as Partial<StoredUiPrefs>
    return {
      advanced: typeof parsed.advanced === 'boolean' ? parsed.advanced : DEFAULT_PREFS.advanced,
      imperial: typeof parsed.imperial === 'boolean' ? parsed.imperial : DEFAULT_PREFS.imperial,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

function writePrefs(prefs: StoredUiPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // ignore write failures (private mode, storage full, disabled, etc.)
  }
}

export function useUiPrefs(): UiPrefsApi {
  const [prefs, setPrefs] = useState<StoredUiPrefs>(readPrefs)

  const setAdvanced = useCallback((v: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, advanced: v }
      writePrefs(next)
      return next
    })
  }, [])

  const setImperial = useCallback((v: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, imperial: v }
      writePrefs(next)
      return next
    })
  }, [])

  return { advanced: prefs.advanced, imperial: prefs.imperial, setAdvanced, setImperial }
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CUSTOM_ENTRY_COLORS } from '@/lib/data/colors'
import type { CustomMegapixel } from '@/lib/types'
import { STORAGE_KEY, STORAGE_VERSION, type StoredCustomMegapixels } from './megapixelTypes'

export function useMegapixelCustomStorage() {
  const [customMps, setCustomMps] = useState<CustomMegapixel[]>([])
  const [hydrated, setHydrated] = useState(false)
  const colorIdxRef = useRef(0)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as StoredCustomMegapixels
        if (parsed.v === STORAGE_VERSION && Array.isArray(parsed.entries)) {
          setCustomMps(parsed.entries)
          colorIdxRef.current = parsed.entries.length
        }
      }
    } catch { /* ignore */ }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      const data: StoredCustomMegapixels = { v: STORAGE_VERSION, entries: customMps }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch { /* ignore */ }
  }, [customMps, hydrated])

  const addCustomMp = useCallback((name: string, mp: number) => {
    const id = `custom_mp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const color = CUSTOM_ENTRY_COLORS[colorIdxRef.current % CUSTOM_ENTRY_COLORS.length]
    colorIdxRef.current += 1
    setCustomMps(prev => [...prev, { id, name, mp, color }])
  }, [])

  const removeCustomMp = useCallback((id: string) => {
    setCustomMps(prev => prev.filter(c => c.id !== id))
  }, [])

  const removeAllCustomMps = useCallback(() => {
    setCustomMps([])
    colorIdxRef.current = 0
  }, [])

  return { customMps, hydrated, addCustomMp, removeCustomMp, removeAllCustomMps }
}

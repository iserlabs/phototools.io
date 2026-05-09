'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { SENSORS, COMMON_MP, calcCropFactor } from '@/lib/data/sensors'
import type { SensorPreset } from '@/lib/types'
import { CUSTOM_COLORS, DEFAULT_VISIBLE_IDS, DEFAULT_VISIBLE } from './sensorSizeTypes'
import type { DisplayMode } from './sensorSizeTypes'
import {
  ALL_SENSOR_ID_SET, customColorIdx, setCustomColorIdx,
  encodeCustomParam, decodeCustomParam, loadCustomSensors, saveCustomSensors,
} from './sensorSizeHelpers'

export function useSensorState() {
  const [visible, setVisible] = useState<Set<string>>(() => new Set(DEFAULT_VISIBLE_IDS))
  const [mode, setMode] = useState<DisplayMode>('overlay')
  const [resolution, setResolution] = useState(24)
  const [customSensors, setCustomSensors] = useState<Required<SensorPreset>[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const customParam = params.get('custom')
    let loadedCustom: Required<SensorPreset>[] = []
    if (customParam) { loadedCustom = decodeCustomParam(customParam); setCustomColorIdx(loadedCustom.length) }
    else { loadedCustom = loadCustomSensors() }

    const customIds = new Set(loadedCustom.map(s => s.id))
    const showParam = params.get('show')
    let newVisible: Set<string>
    if (showParam && showParam.length > 0) {
      const ids = showParam.split(/[+, ]+/).filter(id => id && (ALL_SENSOR_ID_SET.has(id) || customIds.has(id)))
      newVisible = ids.length > 0 ? new Set(ids) : new Set(DEFAULT_VISIBLE_IDS)
    } else if (customParam && loadedCustom.length > 0) {
      newVisible = new Set(loadedCustom.map(s => s.id))
    } else if (loadedCustom.length > 0) {
      newVisible = new Set([...DEFAULT_VISIBLE_IDS, ...loadedCustom.map(s => s.id)])
    } else { newVisible = new Set(DEFAULT_VISIBLE_IDS) }

    const modeParam = params.get('mode')
    const newMode = (modeParam && ['overlay', 'side-by-side', 'pixel-density'].includes(modeParam)) ? modeParam as DisplayMode : 'overlay'
    const mpParam = params.get('mp')
    const newMp = mpParam ? Math.min(Math.max(parseInt(mpParam) || 24, 1), 200) : 24

    setCustomSensors(loadedCustom); setVisible(newVisible); setMode(newMode); setResolution(newMp); setHydrated(true)
  }, [])

  useEffect(() => { if (hydrated) saveCustomSensors(customSensors) }, [customSensors, hydrated])

  const urlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!hydrated) return
    if (urlTimerRef.current) clearTimeout(urlTimerRef.current)
    urlTimerRef.current = setTimeout(() => {
      const url = new URL(window.location.href)
      const showVal = Array.from(visible).filter(id => ALL_SENSOR_ID_SET.has(id) || customSensors.some(s => s.id === id)).join('+')
      if (showVal && showVal !== DEFAULT_VISIBLE) url.searchParams.set('show', showVal)
      else url.searchParams.delete('show')
      if (mode !== 'overlay') url.searchParams.set('mode', mode); else url.searchParams.delete('mode')
      if (resolution !== 24) url.searchParams.set('mp', String(resolution)); else url.searchParams.delete('mp')
      const cp = customSensors.length > 0 ? encodeCustomParam(customSensors) : ''
      if (cp) url.searchParams.set('custom', cp); else url.searchParams.delete('custom')
      window.history.replaceState(null, '', url.toString())
    }, 200)
    return () => { if (urlTimerRef.current) clearTimeout(urlTimerRef.current) }
  }, [visible, mode, resolution, customSensors, hydrated])

  const allSensors = useMemo(() => [...SENSORS as Required<SensorPreset>[], ...customSensors], [customSensors])
  const visibleSensors = useMemo(() => allSensors.filter((s) => visible.has(s.id)), [allSensors, visible])

  const toggleSensor = useCallback((id: string) => {
    setVisible((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }, [])

  const addCustomSensor = useCallback((name: string, w: number, h: number, mp: number) => {
    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const color = CUSTOM_COLORS[customColorIdx % CUSTOM_COLORS.length]
    setCustomColorIdx(customColorIdx + 1)
    const cropFactor = calcCropFactor(w, h)
    setCustomSensors(prev => [...prev, { id, name, w, h, cropFactor, color }])
    setVisible(prev => new Set([...prev, id]))
    if (mp > 0) COMMON_MP[id] = [{ mp, models: name }]
  }, [])

  const editCustomSensor = useCallback((id: string, name: string, w: number, h: number, mp: number) => {
    const cropFactor = calcCropFactor(w, h)
    setCustomSensors(prev => prev.map(s => s.id === id ? { ...s, name, w, h, cropFactor } : s))
    if (mp > 0) COMMON_MP[id] = [{ mp, models: name }]; else delete COMMON_MP[id]
  }, [])

  const removeAllCustomSensors = useCallback(() => {
    for (const s of customSensors) delete COMMON_MP[s.id]
    setCustomSensors([])
    setVisible(prev => { const next = new Set(prev); for (const s of customSensors) next.delete(s.id); return next })
  }, [customSensors])

  const removeCustomSensor = useCallback((id: string) => {
    setCustomSensors(prev => prev.filter(s => s.id !== id))
    setVisible(prev => { const next = new Set(prev); next.delete(id); return next })
    delete COMMON_MP[id]
  }, [])

  return {
    visible, setVisible, mode, setMode, resolution, setResolution,
    customSensors, allSensors, visibleSensors,
    toggleSensor, addCustomSensor, editCustomSensor, removeAllCustomSensors, removeCustomSensor,
  }
}

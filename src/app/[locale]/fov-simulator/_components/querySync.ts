'use client'

import { useEffect, useRef } from 'react'
import type { LensConfig } from '@/lib/types'
import { SENSORS } from '@/lib/data/sensors'
import type { FovSimulatorState } from './types'

const SENSOR_IDS = new Set(SENSORS.map((s) => s.id))
const LENS_KEYS = ['a', 'b', 'c'] as const
const SENSOR_KEYS = ['sa', 'sb', 'sc'] as const

function clampFocal(v: number): number {
  return Math.max(8, Math.min(800, Math.round(v)))
}

function parseLens(params: URLSearchParams, fKey: string, sKey: string): LensConfig | null {
  const f = Number(params.get(fKey))
  if (!f || f < 8 || f > 800) return null
  const lens: LensConfig = { focalLength: clampFocal(f), sensorId: 'ff' }
  const s = params.get(sKey)
  if (s && SENSOR_IDS.has(s)) lens.sensorId = s
  return lens
}

export function parseQueryParams(): Partial<FovSimulatorState> {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const state: Partial<FovSimulatorState> = {}

  const lenses: LensConfig[] = []
  for (let i = 0; i < 3; i++) {
    const lens = parseLens(params, LENS_KEYS[i], SENSOR_KEYS[i])
    if (lens) lenses.push(lens)
  }
  if (lenses.length > 0) state.lenses = lenses

  const img = Number(params.get('img'))
  if (!isNaN(img) && img >= 0 && img <= 3) state.imageIndex = img

  const dist = Number(params.get('dist'))
  if (Number.isInteger(dist) && dist >= 3 && dist <= 100) state.distance = dist

  if (params.get('guides') === '1') state.showGuides = true

  return state
}

function stateToQueryString(state: FovSimulatorState): string {
  const params = new URLSearchParams()
  state.lenses.forEach((lens, i) => {
    params.set(LENS_KEYS[i], String(lens.focalLength))
    params.set(SENSOR_KEYS[i], lens.sensorId)
  })
  params.set('img', String(state.imageIndex))
  if (state.distance !== 10) params.set('dist', String(state.distance))
  if (state.showGuides) params.set('guides', '1')
  return params.toString()
}

export function useQuerySync(state: FovSimulatorState): void {
  const isFirstRender = useRef(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const qs = stateToQueryString(state)
  const qsRef = useRef(qs)
  qsRef.current = qs

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (timerRef.current) return
    timerRef.current = setTimeout(() => {
      const newUrl = `${window.location.pathname}?${qsRef.current}`
      window.history.replaceState(null, '', newUrl)
      timerRef.current = null
    }, 200)
  }, [qs])

  useEffect(() => () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null } }, [])
}

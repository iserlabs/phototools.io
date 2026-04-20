'use client'

import { useRef, useEffect } from 'react'
import { SENSORS } from '@/lib/data/sensors'
import { FOCAL_MAX } from '@/lib/data/focalLengths'
import { calcCameraDistance } from '@/lib/math/compression'

export interface State {
  focalLength: number
  sensorId: string
  distance: number
  maintainSubjectSize: boolean
}

export const DEFAULT_STATE: State = {
  focalLength: 50,
  sensorId: 'ff',
  distance: 15,
  maintainSubjectSize: true,
}

export type Action =
  | { type: 'SET_FOCAL_LENGTH'; payload: number }
  | { type: 'SET_SENSOR'; payload: string }
  | { type: 'SET_DISTANCE'; payload: number }
  | { type: 'SET_MAINTAIN_SIZE'; payload: boolean }
  | { type: 'RESET' }
  | { type: 'HYDRATE'; payload: Partial<State> }

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FOCAL_LENGTH': {
      const newFocal = action.payload
      if (state.maintainSubjectSize && state.focalLength > 0) {
        const newDistance = calcCameraDistance(newFocal, state.focalLength, state.distance)
        return { ...state, focalLength: newFocal, distance: Math.max(3, Math.min(500, newDistance)) }
      }
      return { ...state, focalLength: newFocal }
    }
    case 'SET_SENSOR':
      return { ...state, sensorId: action.payload }
    case 'SET_DISTANCE':
      return { ...state, distance: action.payload }
    case 'SET_MAINTAIN_SIZE':
      return { ...state, maintainSubjectSize: action.payload }
    case 'RESET':
      return { ...DEFAULT_STATE }
    case 'HYDRATE':
      return { ...state, ...action.payload }
    default:
      return state
  }
}

const SENSOR_IDS = new Set(SENSORS.map((s) => s.id))

export function parseQueryParams(): Partial<State> {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const state: Partial<State> = {}

  const fl = Number(params.get('fl'))
  if (fl >= 14 && fl <= 800) state.focalLength = Math.round(fl)

  const s = params.get('s')
  if (s && SENSOR_IDS.has(s)) state.sensorId = s

  const dist = Number(params.get('dist'))
  if (!isNaN(dist) && dist >= 3 && dist <= 500) state.distance = dist

  const m = params.get('m')
  if (m === '1') state.maintainSubjectSize = true
  if (m === '0') state.maintainSubjectSize = false

  return state
}

function stateToQueryString(state: State): string {
  const params = new URLSearchParams()
  params.set('fl', String(state.focalLength))
  params.set('s', state.sensorId)
  params.set('dist', state.distance.toFixed(1))
  params.set('m', state.maintainSubjectSize ? '1' : '0')
  return params.toString()
}

export function useQuerySync(state: State): void {
  const isFirstRender = useRef(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const qs = stateToQueryString(state)
      const newUrl = `${window.location.pathname}?${qs}`
      window.history.replaceState(null, '', newUrl)
    }, 200)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [state])
}

export const LOG_MIN = Math.log(14)
export const LOG_MAX = Math.log(FOCAL_MAX)
export const SLIDER_STEPS = 1000

export function focalToSlider(focal: number): number {
  return Math.round(((Math.log(focal) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * SLIDER_STEPS)
}

export function sliderToFocal(pos: number): number {
  return Math.round(Math.exp(LOG_MIN + (pos / SLIDER_STEPS) * (LOG_MAX - LOG_MIN)))
}

export const SNAP_THRESHOLD = 15

export const DIST_MIN = 3
export const DIST_MAX = 500
const LOG_DIST_MIN = Math.log(DIST_MIN)
const LOG_DIST_MAX = Math.log(DIST_MAX)
export const DIST_SLIDER_STEPS = 500

export function distToSlider(dist: number): number {
  const clamped = Math.max(DIST_MIN, Math.min(DIST_MAX, dist))
  return Math.round(((Math.log(clamped) - LOG_DIST_MIN) / (LOG_DIST_MAX - LOG_DIST_MIN)) * DIST_SLIDER_STEPS)
}

export function sliderToDist(pos: number): number {
  return Math.exp(LOG_DIST_MIN + (pos / DIST_SLIDER_STEPS) * (LOG_DIST_MAX - LOG_DIST_MIN))
}

export { DIST_PRESETS } from '@/lib/data/perspectiveCompression'

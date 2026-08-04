import type { PanoOrientation } from '@/lib/math/panorama'
import { intParam, strParam, sensorParam } from '@/lib/utils/querySync'

/**
 * Declared as a type alias rather than an interface so it carries an implicit
 * index signature — `useToolQuerySync` takes `Record<string, unknown>`.
 */
export type PanoState = {
  focal: number
  sensor: string
  orient: PanoOrientation
  overlap: number
  target: number
  rows: number
  mp: number
}

export const PANO_PARAM_SCHEMA = {
  focal: intParam(35, 8, 1200),
  sensor: sensorParam('ff'),
  orient: strParam<PanoOrientation>('portrait', ['landscape', 'portrait']),
  overlap: intParam(30, 10, 60),
  target: intParam(180, 45, 360),
  rows: intParam(1, 1, 4),
  mp: intParam(24, 8, 150),
}

export const PANO_DEFAULT_STATE: PanoState = {
  focal: 35, sensor: 'ff', orient: 'portrait', overlap: 30, target: 180, rows: 1, mp: 24,
}

export const TARGET_WIDTHS = [90, 120, 180, 270, 360]
export const ROW_OPTIONS = [1, 2, 3, 4]

/**
 * Photography Cheat Sheet scenario data.
 *
 * Numeric setting values (aperture/shutter/ISO ranges) are technical notation
 * and stay untranslated in data. White balance, focus and drive modes are
 * stored as ids resolved through `toolUI.photography-cheat-sheet.values.*`
 * so they translate. Scenario names and tips live in the toolUI JSON under
 * `scenarios.<id>`.
 */

export const WB_VALUES = ['auto', 'daylight', 'cloudy', 'shade', 'tungsten'] as const
export const FOCUS_VALUES = ['afSingle', 'afContinuous', 'afTracking', 'manualFocus'] as const
export const DRIVE_VALUES = ['single', 'burstLow', 'burstHigh', 'timer2s', 'intervalometer'] as const

export type WbValue = (typeof WB_VALUES)[number]
export type FocusValue = (typeof FOCUS_VALUES)[number]
export type DriveValue = (typeof DRIVE_VALUES)[number]

export interface CheatScenario {
  id: string
  aperture: string
  shutter: string
  iso: string
  whiteBalance: WbValue
  focusMode: FocusValue
  driveMode: DriveValue
  /** Number of tips in the toolUI JSON under scenarios.<id>.tips */
  tipCount: number
}

export const CHEAT_SCENARIOS: CheatScenario[] = [
  { id: 'portrait', aperture: 'f/1.8–f/2.8', shutter: '1/200s+', iso: '100–400', whiteBalance: 'auto', focusMode: 'afSingle', driveMode: 'single', tipCount: 2 },
  { id: 'landscape', aperture: 'f/8–f/11', shutter: '1/60s+', iso: '64–100', whiteBalance: 'daylight', focusMode: 'afSingle', driveMode: 'timer2s', tipCount: 2 },
  { id: 'street', aperture: 'f/5.6–f/8', shutter: '1/250s+', iso: 'Auto (–3200)', whiteBalance: 'auto', focusMode: 'afContinuous', driveMode: 'burstLow', tipCount: 2 },
  { id: 'wildlife', aperture: 'f/4–f/6.3', shutter: '1/1000s–1/3200s', iso: 'Auto (–6400)', whiteBalance: 'auto', focusMode: 'afTracking', driveMode: 'burstHigh', tipCount: 2 },
  { id: 'sports', aperture: 'f/2.8–f/4', shutter: '1/1000s+', iso: 'Auto (–6400)', whiteBalance: 'auto', focusMode: 'afTracking', driveMode: 'burstHigh', tipCount: 2 },
  { id: 'macro', aperture: 'f/8–f/16', shutter: '1/200s', iso: '100–400', whiteBalance: 'auto', focusMode: 'manualFocus', driveMode: 'single', tipCount: 2 },
  { id: 'milkyWay', aperture: 'f/1.4–f/2.8', shutter: '10s–25s', iso: '1600–6400', whiteBalance: 'tungsten', focusMode: 'manualFocus', driveMode: 'timer2s', tipCount: 2 },
  { id: 'nightCity', aperture: 'f/8–f/11', shutter: '2s–10s', iso: '64–100', whiteBalance: 'tungsten', focusMode: 'afSingle', driveMode: 'timer2s', tipCount: 2 },
  { id: 'waterfall', aperture: 'f/8–f/11', shutter: '0.5s–2s', iso: '64–100', whiteBalance: 'daylight', focusMode: 'afSingle', driveMode: 'timer2s', tipCount: 2 },
  { id: 'goldenHour', aperture: 'f/2.8–f/8', shutter: '1/250s+', iso: '100–400', whiteBalance: 'cloudy', focusMode: 'afSingle', driveMode: 'single', tipCount: 2 },
]

export function getScenario(id: string): CheatScenario {
  return CHEAT_SCENARIOS.find((s) => s.id === id) ?? CHEAT_SCENARIOS[0]
}

export const SCENARIO_IDS = CHEAT_SCENARIOS.map((s) => s.id)

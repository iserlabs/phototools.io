export type HarmonyType =
  | 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic'
  | 'monochromatic' | 'custom'
export type TemplateHarmony = Exclude<HarmonyType, 'custom'>

/** value = state/URL value, key = i18n key under toolUI.color-analyzer */
export const HARMONY_KEYS: { value: HarmonyType; key: string }[] = [
  { value: 'complementary', key: 'complementary' },
  { value: 'split-complementary', key: 'splitComplementary' },
  { value: 'analogous', key: 'analogous' },
  { value: 'triadic', key: 'triadic' },
  { value: 'tetradic', key: 'tetradic' },
  { value: 'monochromatic', key: 'monochromatic' },
  { value: 'custom', key: 'custom' },
]

export const TEMPLATE_HARMONIES: TemplateHarmony[] = [
  'complementary', 'split-complementary', 'analogous', 'triadic', 'tetradic', 'monochromatic',
]

/** 24 bands of 15°. Index i covers hues in [15i − 7.5, 15i + 7.5). Names are i18n keys. */
export const HUE_BAND_KEYS = [
  'red', 'vermilion', 'orange', 'amber', 'yellow', 'lime',
  'chartreuse', 'leaf-green', 'green', 'jade', 'spring-green', 'mint',
  'cyan', 'sky-blue', 'azure', 'cobalt', 'blue', 'indigo',
  'violet', 'purple', 'magenta', 'fuchsia', 'pink', 'rose',
] as const

export const NEUTRAL_KEYS = { gray: 'gray', black: 'black', white: 'white' } as const

/** A sample is neutral (not scorable) when any of these holds. Percent units. */
export const NEUTRAL = { minSat: 8, minLight: 8, maxLight: 94 } as const

/** Hue-degree thresholds for the nudge band. */
export const NUDGE = { aligned: 8, slight: 25 } as const

export const SAMPLE_CAP = 8
export const PATCH_SIZE = 5
export const ANALYSIS_LONG_EDGE = 1600
export const CLUSTER = { k: 5, width: 64, iterations: 12, chromaticMinFraction: 0.05, seed: 7 } as const
export const MONO_LIGHTNESS = [20, 35, 50, 65, 80] as const

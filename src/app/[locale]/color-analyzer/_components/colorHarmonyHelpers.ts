import { complementary, analogous, triadic, splitComplementary, tetradic } from '@/lib/math/color'
import { type HarmonyType, HARMONY_KEYS } from '@/lib/data/colorAnalyzer'

export type { HarmonyType }
export { HARMONY_KEYS }

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')
}

export function getHarmonyHues(hue: number, type: HarmonyType, splitAngle: number, analogousSpread: number, tetradicOffset: number): number[] {
  switch (type) {
    case 'complementary': return complementary(hue)
    case 'analogous': return analogous(hue, analogousSpread)
    case 'triadic': return triadic(hue)
    case 'split-complementary': return splitComplementary(hue, splitAngle)
    case 'tetradic': return tetradic(hue, tetradicOffset)
    case 'monochromatic': case 'custom': return [hue]
  }
}

export function getBaseIndex(type: HarmonyType): number {
  if (type === 'analogous') return 1
  return 0
}

export function getSuggestion(hue: number, type: HarmonyType): string {
  const isWarm = (hue >= 0 && hue < 70) || hue >= 330
  const isCool = hue >= 170 && hue < 270

  switch (type) {
    case 'complementary':
      if (isWarm) return 'suggestions.complementary.warm'
      if (isCool) return 'suggestions.complementary.cool'
      return 'suggestions.complementary.default'
    case 'analogous':
      if (isWarm) return 'suggestions.analogous.warm'
      if (isCool) return 'suggestions.analogous.cool'
      return 'suggestions.analogous.default'
    case 'triadic':
      return 'suggestions.triadic'
    case 'split-complementary':
      if (isWarm) return 'suggestions.splitComplementary.warm'
      return 'suggestions.splitComplementary.default'
    case 'tetradic':
      return 'suggestions.tetradic'
    default:
      return 'suggestions.triadic'
  }
}

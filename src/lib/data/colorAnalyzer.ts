export type HarmonyType = 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic'

export const HARMONY_KEYS: { value: HarmonyType; key: string }[] = [
  { value: 'complementary', key: 'complementary' },
  { value: 'analogous', key: 'analogous' },
  { value: 'triadic', key: 'triadic' },
  { value: 'split-complementary', key: 'splitComplementary' },
  { value: 'tetradic', key: 'tetradic' },
]

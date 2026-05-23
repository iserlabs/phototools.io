'use client'

import { useCurrentPng } from 'recharts-to-png'

/** A function returning a PNG data URL (or undefined on failure) for one chart. */
export type PngGetter = () => Promise<string | undefined>

/**
 * Re-export of recharts-to-png's hook so call sites import it from here, keeping
 * the dynamic-import boundary localized. Returns [getPng, { ref, isLoading }].
 * Attach `ref` to the Recharts chart component you want rasterized; call getPng()
 * to capture it. Rasterized at 2× via html2canvas options for print crispness.
 */
export function useChartPng() {
  return useCurrentPng({ scale: 2, backgroundColor: '#0d0d0d' })
}

/**
 * Run an ordered map of PNG getters STRICTLY sequentially (one at a time), per
 * spec §7.2. Never lets two html2canvas passes overlap. Returns a map of the same
 * keys to data URLs (or null when a getter yields undefined).
 */
export async function rasterizeRechartsCharts<K extends string>(
  getters: Record<K, PngGetter>,
): Promise<Record<K, string | null>> {
  const out = {} as Record<K, string | null>
  for (const key of Object.keys(getters) as K[]) {
    const url = await getters[key]() // await between each — sequential by construction
    out[key] = url ?? null
  }
  return out
}

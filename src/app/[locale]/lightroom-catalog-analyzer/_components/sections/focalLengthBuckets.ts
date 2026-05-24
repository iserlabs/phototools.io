export interface FocalBucket {
  /** Lower bound (mm) of the bucket — also the chart category key. */
  start: number
  /** Display label: "70–85mm" for a range, or "23mm" for a 1mm bucket. */
  label: string
  count: number
  /** True when the most-used focal length (topMm) falls in this bucket. */
  highlight: boolean
}

/**
 * Group a per-zoom 1mm focal-length histogram into a readable number of ranges.
 *
 * A zoom that's used across its whole range produces ~100 single-mm bars, which
 * renders as an unreadable hairline forest. Bucketing collapses those into
 * ~`targetBuckets` evenly-sized ranges (e.g. 70–85mm, 86–101mm …). When a lens
 * already has few distinct focal lengths (≤ targetBuckets) the values pass
 * through unbucketed so a 24/35/50 prime-ish zoom still reads exactly.
 *
 * `highlightMm` (the most-used focal length) tags whichever bucket contains it
 * so the caller can accent that bar.
 */
export function bucketFocalLengths(
  histogram: ReadonlyArray<{ mm: number; count: number }>,
  targetBuckets = 8,
  highlightMm?: number,
): FocalBucket[] {
  if (histogram.length === 0) return []

  if (histogram.length <= targetBuckets) {
    return histogram.map((h) => ({
      start: h.mm,
      label: `${h.mm}mm`,
      count: h.count,
      highlight: h.mm === highlightMm,
    }))
  }

  const min = histogram[0]!.mm
  const max = histogram[histogram.length - 1]!.mm
  const span = Math.max(1, max - min)
  const step = Math.max(1, Math.ceil(span / targetBuckets))

  const byStart = new Map<number, number>()
  for (const { mm, count } of histogram) {
    const start = min + Math.floor((mm - min) / step) * step
    byStart.set(start, (byStart.get(start) ?? 0) + count)
  }

  return [...byStart.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([start, count]) => ({
      start,
      label: step === 1 ? `${start}mm` : `${start}–${start + step - 1}mm`,
      count,
      highlight: highlightMm !== undefined && highlightMm >= start && highlightMm < start + step,
    }))
}

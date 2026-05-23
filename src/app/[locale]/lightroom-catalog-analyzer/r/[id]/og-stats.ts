import type { InsightBlob } from '@/lib/lrcat/types'

export interface OgStatCell {
  label: string
  value: string
}

export interface OgStats {
  filtered: boolean
  dateRange: string
  cells: OgStatCell[]
}

/** Pure: derive the OG stat strip from an InsightBlob. Labels are English (the
 *  OG route is not locale-aware text; the image is brand-consistent everywhere). */
export function buildOgStats(blob: InsightBlob): OgStats {
  const o = blob.overview
  const dateRange = o.dateRange.first && o.dateRange.last ? `${o.dateRange.first} – ${o.dateRange.last}` : '—'
  return {
    filtered: Boolean(blob.filterContext),
    dateRange,
    cells: [
      { label: 'Photos', value: o.totalPhotos.toLocaleString('en-US') },
      { label: 'Date range', value: dateRange },
      { label: 'Top body', value: o.topBody ?? '—' },
      { label: 'Top lens', value: o.topLens ?? '—' },
      { label: 'Top focal length', value: o.topFocalLengthMm != null ? `${o.topFocalLengthMm}mm` : '—' },
    ],
  }
}

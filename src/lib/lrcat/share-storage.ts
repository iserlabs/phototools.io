import type { AnalysisFilter } from './types'

export const SHARE_STORAGE_KEY = 'phototools.lrcat.shares'
export const MAX_SHARE_RECORDS = 20

export interface ShareRecord {
  id: string
  url: string
  createdAt: number
  expiresAt: number
  filterContext?: AnalysisFilter
}

function read(): ShareRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(SHARE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ShareRecord[]) : []
  } catch {
    return []
  }
}

function write(records: ShareRecord[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SHARE_STORAGE_KEY, JSON.stringify(records))
  } catch {
    /* quota / private mode — non-fatal, history simply isn't persisted */
  }
}

function prune(records: ShareRecord[]): ShareRecord[] {
  const now = Date.now()
  return records.filter((r) => r.expiresAt > now)
}

/** Append (or update in place) a record, newest-first, with LRU eviction. */
export function appendShare(record: ShareRecord): void {
  const existing = prune(read()).filter((r) => r.id !== record.id)
  const next = [record, ...existing]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_SHARE_RECORDS)
  write(next)
}

/** Return non-expired records (newest-first); prunes storage as a side effect. */
export function listActiveShares(): ShareRecord[] {
  const pruned = prune(read()).sort((a, b) => b.createdAt - a.createdAt)
  write(pruned)
  return pruned
}

/** Remove a record by id. */
export function removeShare(id: string): void {
  write(prune(read()).filter((r) => r.id !== id))
}

/** Compact human summary of an active filter for the recent-shares list. */
export function summarizeFilter(filter: AnalysisFilter): string {
  const parts: string[] = []
  if (filter.dateRange) parts.push(`dates ${filter.dateRange.start}–${filter.dateRange.end}`)
  if (filter.cameras?.length) parts.push(`cameras ${filter.cameras.join(', ')}`)
  if (filter.lenses?.length) parts.push(`lenses ${filter.lenses.join(', ')}`)
  if (filter.focalLengthRange) parts.push(`focal ${filter.focalLengthRange[0]}–${filter.focalLengthRange[1]}mm`)
  if (filter.apertureRange) parts.push(`aperture f/${filter.apertureRange[0]}–f/${filter.apertureRange[1]}`)
  if (filter.isoRange) parts.push(`ISO ${filter.isoRange[0]}–${filter.isoRange[1]}`)
  if (filter.ratings?.length) parts.push(`ratings ${filter.ratings.join(',')}`)
  if (filter.keywords?.length) parts.push(`keywords ${filter.keywords.join(', ')}`)
  if (filter.picks) parts.push(`picks ${filter.picks}`)
  return parts.join(' · ')
}

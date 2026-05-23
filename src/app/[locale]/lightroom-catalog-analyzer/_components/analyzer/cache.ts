import { get, set, del, keys } from 'idb-keyval'
import type { InsightBlob } from '@/lib/lrcat/types'

const ENTRY_PREFIX = 'lrcat:'
const INDEX_KEY = `${ENTRY_PREFIX}index`
const MAX_ENTRIES = 10
const TTL_MS = 90 * 24 * 60 * 60 * 1000 // 90 days

interface IndexEntry { hash: string; lastAccess: number }
interface CacheRecord { blob: InsightBlob; storedAt: number }

function entryKey(hash: string): string {
  return `${ENTRY_PREFIX}${hash}`
}

async function loadIndex(): Promise<IndexEntry[]> {
  try {
    const idx = (await get(INDEX_KEY)) as IndexEntry[] | undefined
    if (!Array.isArray(idx)) return []
    return idx
  } catch {
    return []
  }
}

async function saveIndex(idx: IndexEntry[]): Promise<void> {
  try { await set(INDEX_KEY, idx) } catch { /* non-fatal */ }
}

async function touchIndex(hash: string): Promise<IndexEntry[]> {
  const now = Date.now()
  const idx = (await loadIndex()).filter((e) => e.hash !== hash)
  idx.push({ hash, lastAccess: now })
  await saveIndex(idx)
  return idx
}

async function evictIfFull(idx: IndexEntry[]): Promise<void> {
  if (idx.length <= MAX_ENTRIES) return
  // Sort ascending by lastAccess and evict the oldest until we're at cap.
  idx.sort((a, b) => a.lastAccess - b.lastAccess)
  while (idx.length > MAX_ENTRIES) {
    const evicted = idx.shift()
    if (evicted) {
      try { await del(entryKey(evicted.hash)) } catch { /* non-fatal */ }
    }
  }
  await saveIndex(idx)
}

export async function getCachedInsights(hash: string): Promise<InsightBlob | null> {
  try {
    const rec = (await get(entryKey(hash))) as CacheRecord | undefined
    if (!rec) return null
    if (Date.now() - rec.storedAt > TTL_MS) {
      try { await del(entryKey(hash)) } catch { /* non-fatal */ }
      const idx = (await loadIndex()).filter((e) => e.hash !== hash)
      await saveIndex(idx)
      return null
    }
    // Refresh lastAccess to support LRU eviction.
    await touchIndex(hash)
    return rec.blob
  } catch {
    return null
  }
}

export async function setCachedInsights(hash: string, blob: InsightBlob): Promise<void> {
  try {
    const record: CacheRecord = { blob, storedAt: Date.now() }
    await set(entryKey(hash), record)
    const idx = await touchIndex(hash)
    await evictIfFull(idx)
  } catch {
    // Non-fatal: storage may be full, in private-mode, or the blob may have
    // unclonable members. Either way, callers proceed without a cache write.
  }
}

export async function clearAllCachedInsights(): Promise<void> {
  try {
    const allKeys = await keys()
    for (const k of allKeys) {
      if (typeof k === 'string' && k.startsWith(ENTRY_PREFIX)) {
        try { await del(k) } catch { /* noop */ }
      }
    }
  } catch {
    // Non-fatal.
  }
}

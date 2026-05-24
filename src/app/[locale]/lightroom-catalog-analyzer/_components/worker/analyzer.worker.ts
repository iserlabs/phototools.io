/// <reference lib="webworker" />
import * as Comlink from 'comlink'
import type {
  AnalysisFilter,
  InsightBlob,
  ProgressEvent,
  YearInReviewBlock,
} from '@/lib/lrcat/types'
import {
  openCatalog,
  openCatalogFromFile,
  wipeOpfsCatalog,
  type Database,
  UnsupportedCatalogError,
} from './open'
import { computeCatalogHash } from './hash'
import { populateCropFactorTable } from './crop-factor'
import { aggregateYearInReview } from './aggregators/year-in-review'
import { runAggregators, type AggregatorDb } from './run-aggregators'

/**
 * Adapt sqlite-wasm's Database to the AggregatorDb interface.
 *
 * sqlite-wasm throws "This statement has no bindable parameters" if you pass
 * a (non-undefined) bind to a parameterless query — so coerce empty arrays
 * to `undefined`. better-sqlite3 (tests) tolerates `[]`, hence the split.
 */
function adaptDatabase(db: Database): AggregatorDb {
  const bind = (params?: unknown[]) =>
    params && params.length > 0 ? (params as never) : undefined
  return {
    selectObject: (sql, params) => db.selectObject(sql, bind(params)),
    selectObjects: (sql, params) => db.selectObjects(sql, bind(params)),
    exec: (sql) => { db.exec(sql) },
  }
}

let dbHandle: Database | null = null
let adapted: AggregatorDb | null = null
let catalogVersion = 0
let catalogHash = ''
let parsedAt = 0

function requireDb(): AggregatorDb {
  if (!adapted) throw new Error('Catalog not open. Call openCatalog first.')
  return adapted
}

function closePrior(): void {
  // Close any prior handle (e.g. user picked a second catalog without reload).
  if (dbHandle) {
    try { dbHandle.close() } catch { /* ignore */ }
    dbHandle = null
    adapted = null
  }
}

/** Wrap a progress callback so reported pct never goes backward. The streaming
 *  import ramps the bar to ~90%; aggregator events (which start lower) are then
 *  clamped up so the bar doesn't visibly regress. */
function monotonic(onProgress?: (e: ProgressEvent) => void): (e: ProgressEvent) => void {
  let max = 0
  return (e) => {
    max = Math.max(max, e.pct)
    onProgress?.({ stage: e.stage, pct: max })
  }
}

/**
 * Shared post-open pipeline: adopt the handle, build the crop-factor table,
 * record the catalog hash, run the 16 aggregators, and return the blob.
 */
async function finishOpen(
  opened: { db: Database; catalogVersion: number },
  onProgress: ((e: ProgressEvent) => void) | undefined,
  computeHash: () => Promise<string>,
): Promise<InsightBlob> {
  dbHandle = opened.db
  adapted = adaptDatabase(opened.db)
  catalogVersion = opened.catalogVersion

  // Populate the 35mm-equivalent crop-factor table from sensors.ts so the
  // focal-length aggregator's LEFT JOIN resolves real crop factors.
  onProgress?.({ stage: 'schema', pct: 2 })
  populateCropFactorTable(adapted)

  onProgress?.({ stage: 'hashing', pct: 4 })
  catalogHash = await computeHash()
  parsedAt = Date.now()

  const blob = runAggregators(adapted, { catalogVersion, catalogHash, parsedAt }, undefined, onProgress)
  onProgress?.({ stage: 'finalizing', pct: 100 })
  return blob
}

const api = {
  async openCatalog(
    buffer: ArrayBuffer,
    onProgress?: (e: ProgressEvent) => void,
    fileSize?: number,
    lastModified?: number,
    precomputedHash?: string,
  ): Promise<InsightBlob> {
    closePrior()
    onProgress?.({ stage: 'opening', pct: 0 })

    let opened: { db: Database; catalogVersion: number }
    try {
      opened = await openCatalog(buffer)
    } catch (e) {
      if (e instanceof UnsupportedCatalogError) throw e
      throw new Error('Failed to open catalog: ' + (e as Error).message)
    }

    return finishOpen(opened, onProgress, async () =>
      precomputedHash ?? computeCatalogHash(buffer, fileSize ?? buffer.byteLength, lastModified ?? Date.now()),
    )
  },

  /**
   * Open a (potentially multi-GB) catalog from a File. Streams it into OPFS and
   * pages from disk via the SAH-Pool VFS; falls back to the in-memory buffer
   * path when OPFS is unavailable (older engines / Node tests).
   */
  async openCatalogFile(
    file: File,
    onProgress?: (e: ProgressEvent) => void,
    precomputedHash?: string,
  ): Promise<InsightBlob> {
    closePrior()
    const progress = monotonic(onProgress)
    progress({ stage: 'opening', pct: 0 })

    const hashFromSample = async () =>
      precomputedHash ??
      computeCatalogHash(await file.slice(0, 64 * 1024).arrayBuffer(), file.size, file.lastModified)

    let opened: { db: Database; catalogVersion: number } | null
    try {
      opened = await openCatalogFromFile(file, (read, total) => {
        // Reserve 0–90% of the bar for the (slow) streaming import.
        progress({ stage: 'opening', pct: Math.round((read / Math.max(total, 1)) * 90) })
      })
    } catch (e) {
      if (e instanceof UnsupportedCatalogError) throw e
      throw new Error('Failed to open catalog: ' + (e as Error).message)
    }

    if (opened) return finishOpen(opened, progress, hashFromSample)

    // OPFS unavailable → fall back to reading the whole file into a buffer.
    // (Works for catalogs that fit in memory; very large ones will surface a
    // clear allocation error, which the UI maps to a parse failure.)
    const buffer = await file.arrayBuffer()
    let bufOpened: { db: Database; catalogVersion: number }
    try {
      bufOpened = await openCatalog(buffer)
    } catch (e) {
      if (e instanceof UnsupportedCatalogError) throw e
      throw new Error('Failed to open catalog: ' + (e as Error).message)
    }
    return finishOpen(bufOpened, progress, hashFromSample)
  },

  async applyFilter(filter: AnalysisFilter): Promise<InsightBlob> {
    return runAggregators(requireDb(), { catalogVersion, catalogHash, parsedAt }, filter)
  },

  async computeYearInReview(year: number): Promise<YearInReviewBlock> {
    const db = requireDb()
    return aggregateYearInReview(db, year)
  },

  async close(): Promise<void> {
    if (dbHandle) {
      try { dbHandle.close() } catch { /* ignore */ }
      dbHandle = null
    }
    adapted = null
    catalogVersion = 0
    catalogHash = ''
    parsedAt = 0
    // Remove the streamed catalog copy from OPFS so a user's catalog doesn't
    // linger on disk after they're done (privacy + storage reclaim).
    await wipeOpfsCatalog()
  },
}

export type AnalyzerWorker = typeof api

Comlink.expose(api)

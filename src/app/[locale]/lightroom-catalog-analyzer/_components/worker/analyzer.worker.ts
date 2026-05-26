/// <reference lib="webworker" />
import * as Comlink from 'comlink'
import type {
  AnalysisFilter,
  InsightBlob,
  ProgressEvent,
  YearInReviewBlock,
} from '@/lib/lrcat/types'
import { openCatalog, type Database, UnsupportedCatalogError } from './open'
import { computeCatalogHash } from './hash'
import { populateCropFactorTable } from './crop-factor'
import { aggregateYearInReview } from './aggregators/year-in-review'
import { runAggregators, type AggregatorDb } from './run-aggregators'

/**
 * Wrap the sqlite-wasm oo1 `Database` so aggregators stay decoupled from
 * sqlite-wasm's exact binding types. Empty param arrays are coerced to
 * `undefined` because sqlite-wasm throws on bind-less queries with `[]`.
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

const api = {
  async openCatalog(
    buffer: ArrayBuffer,
    onProgress?: (e: ProgressEvent) => void,
    fileSize?: number,
    lastModified?: number,
  ): Promise<InsightBlob> {
    // Close any prior handle (e.g. user picked a second catalog without reload).
    if (dbHandle) {
      try { dbHandle.close() } catch { /* ignore */ }
      dbHandle = null
      adapted = null
    }

    onProgress?.({ stage: 'opening', pct: 0 })

    let opened: { db: Database; catalogVersion: number }
    try {
      opened = await openCatalog(buffer)
    } catch (e) {
      if (e instanceof UnsupportedCatalogError) throw e
      throw new Error('Failed to open catalog: ' + (e as Error).message)
    }

    dbHandle = opened.db
    adapted = adaptDatabase(opened.db)
    catalogVersion = opened.catalogVersion

    onProgress?.({ stage: 'schema', pct: 2 })
    populateCropFactorTable(adapted)

    onProgress?.({ stage: 'hashing', pct: 4 })
    catalogHash = await computeCatalogHash(buffer, fileSize ?? buffer.byteLength, lastModified ?? Date.now())
    parsedAt = Date.now()

    const blob = runAggregators(adapted, catalogVersion, catalogHash, parsedAt, undefined, onProgress)
    onProgress?.({ stage: 'finalizing', pct: 100 })
    return blob
  },

  async applyFilter(filter: AnalysisFilter): Promise<InsightBlob> {
    return runAggregators(requireDb(), catalogVersion, catalogHash, parsedAt, filter)
  },

  async computeYearInReview(year: number): Promise<YearInReviewBlock> {
    return aggregateYearInReview(requireDb(), year)
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
  },
}

export type AnalyzerWorker = typeof api

Comlink.expose(api)

'use client'

import { createContext, useContext } from 'react'
import type * as Comlink from 'comlink'
import type {
  InsightBlob,
  AnalysisFilter,
  ProgressEvent,
  YearInReviewBlock,
} from '@/lib/lrcat/types'

export type { ProgressEvent } from '@/lib/lrcat/types'

/**
 * The Comlink-wrapped worker surface (defined in Plan 1d `analyzer.worker.ts`).
 * Re-exported here under the canonical name `AnalyzerWorker` so Plan 1f section
 * components can `import type { AnalyzerWorker } from '../analyzer/AnalyzerContext'`.
 *
 * The live worker's `openCatalog` accepts optional `fileSize`/`lastModified`
 * trailing args; they are typed here so the handle stays callable from the hook.
 */
export type AnalyzerWorker = Comlink.Remote<{
  openCatalog(
    buffer: ArrayBuffer,
    onProgress?: (e: ProgressEvent) => void | Promise<void>,
    fileSize?: number,
    lastModified?: number,
  ): Promise<InsightBlob>
  applyFilter(filter: AnalysisFilter): Promise<InsightBlob>
  computeYearInReview(year: number): Promise<YearInReviewBlock>
  close(): Promise<void>
}>

export type AnalyzerStatus = 'idle' | 'parsing' | 'loaded' | 'error'

/**
 * Flattened context surface consumed by `useAnalyzer()` and all Plan 1f
 * section components. This is the canonical contract from EXECUTION-NOTES §2 —
 * sections read `insightBlob` (only mounted when `status === 'loaded'`) and the
 * few that re-query (YearInReview, PeriodComparison) call `worker` directly.
 */
export interface AnalyzerContextValue {
  status: AnalyzerStatus
  insightBlob: InsightBlob | null
  worker: AnalyzerWorker | null
  filter: AnalysisFilter | undefined
  error: string | null
  loadedFromCache: boolean
  lastProgress: ProgressEvent | null
  open: (buffer: ArrayBuffer, meta: OpenCatalogMeta, opts?: OpenOptions) => Promise<void>
  applyFilter: (filter: AnalysisFilter) => Promise<void>
  setFilter: (filter: AnalysisFilter) => void
  reset: () => void
  setYearInReview: (block: YearInReviewBlock) => void
  close: () => void
}

export interface OpenCatalogMeta {
  name: string
  size: number
  lastModified: number
}

export interface OpenOptions {
  /** Skip the IDB cache and re-parse from the original buffer (m-10 re-analyze). */
  forceFresh?: boolean
}

export const AnalyzerContext = createContext<AnalyzerContextValue | null>(null)

/**
 * Internal accessor — throws if used outside the provider. Public consumers
 * import `useAnalyzer` from `./useAnalyzer` (which re-exports this).
 */
export function useAnalyzerContextValue(): AnalyzerContextValue {
  const ctx = useContext(AnalyzerContext)
  if (!ctx) throw new Error('useAnalyzer must be used inside <AnalyzerProvider>')
  return ctx
}

// Canonical hook. Plan 1f section components import `useAnalyzer` directly from
// this module; `./useAnalyzer` also re-exports an identical delegate. Both paths
// return the same flattened AnalyzerContextValue.
export const useAnalyzer = useAnalyzerContextValue

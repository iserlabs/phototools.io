/**
 * Reducer for AnalyzerProvider state management.
 *
 * Extracted from AnalyzerProvider.tsx to keep both files under 200 lines.
 */
import type { AnalyzerStatus, AnalyzerWorker } from './AnalyzerContext'
import type { AnalysisFilter, InsightBlob, ProgressEvent } from '@/lib/lrcat/types'

export interface ReducerState {
  status: AnalyzerStatus
  blob: InsightBlob | null
  worker: AnalyzerWorker | null
  filter: AnalysisFilter | undefined
  lastProgress: ProgressEvent | null
  errorKind: string | null
  loadedFromCache: boolean
}

export type Action =
  | { type: 'parse-start' }
  | { type: 'worker-ready'; worker: AnalyzerWorker }
  | { type: 'parse-progress'; ev: ProgressEvent }
  | { type: 'parse-success'; blob: InsightBlob; loadedFromCache: boolean }
  | { type: 'parse-failure'; kind: string }
  | { type: 'filter-applied'; blob: InsightBlob; filter: AnalysisFilter }
  | { type: 'reset-filter'; blob: InsightBlob }
  | { type: 'set-filter'; filter: AnalysisFilter | undefined }
  | { type: 'patch-blob'; partial: Partial<InsightBlob> }
  | { type: 'reset' }

export const initialState: ReducerState = {
  status: 'idle',
  blob: null,
  worker: null,
  filter: undefined,
  lastProgress: null,
  errorKind: null,
  loadedFromCache: false,
}

export function reducer(state: ReducerState, action: Action): ReducerState {
  switch (action.type) {
    case 'parse-start':
      return { ...initialState, worker: state.worker, status: 'parsing' }
    case 'worker-ready':
      return { ...state, worker: action.worker }
    case 'parse-progress':
      return { ...state, lastProgress: action.ev }
    case 'parse-success':
      return { ...state, status: 'loaded', blob: action.blob, loadedFromCache: action.loadedFromCache, errorKind: null }
    case 'parse-failure':
      return { ...state, status: 'error', errorKind: action.kind }
    case 'filter-applied':
      return { ...state, blob: action.blob, filter: action.filter }
    case 'reset-filter':
      return { ...state, blob: action.blob, filter: undefined }
    case 'set-filter':
      return { ...state, filter: action.filter }
    case 'patch-blob':
      if (!state.blob) return state
      return { ...state, blob: { ...state.blob, ...action.partial } }
    case 'reset':
      return { ...initialState }
    default:
      return state
  }
}

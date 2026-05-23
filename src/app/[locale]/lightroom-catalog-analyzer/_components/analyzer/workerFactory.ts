import * as Comlink from 'comlink'
import type { AnalyzerWorker } from './AnalyzerContext'

export interface AnalyzerHandle {
  /** Comlink-wrapped worker surface (the canonical `AnalyzerWorker` remote). */
  api: AnalyzerWorker
  dispose: () => void
}

/**
 * Lazily create the worker + Comlink proxy. Called by useAnalyzer on the
 * first user action (file pick / demo) so the empty-state bundle stays small.
 *
 * Turbopack rewrites `new URL(..., import.meta.url)` into a worker chunk.
 */
export function createAnalyzerApi(): AnalyzerHandle {
  const worker = new Worker(
    new URL('../worker/analyzer.worker.ts', import.meta.url),
    { type: 'module' },
  )
  const api = Comlink.wrap<AnalyzerWorker>(worker) as AnalyzerWorker
  return {
    api,
    dispose: () => {
      try { (api as unknown as { [Comlink.releaseProxy]: () => void })[Comlink.releaseProxy]() } catch { /* noop */ }
      worker.terminate()
    },
  }
}

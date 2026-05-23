'use client'

import { useEffect, useRef } from 'react'
import * as Comlink from 'comlink'
import type { AnalyzerWorker } from '../worker/analyzer.worker'

// ⚠ THROWAWAY STUB (Plan 1d / Audit B-3).
// Plan 1e OVERWRITES this file wholesale with the store-integrated,
// flattened-context version described in EXECUTION-NOTES §2
// (status / insightBlob / worker / filter / open / applyFilter / ...).
// Do NOT invest in this version — it exists only so the file path is in place
// and the worker can be smoke-instantiated before Plan 1e lands.

export interface AnalyzerHandle {
  api: Comlink.Remote<AnalyzerWorker>
  terminate: () => void
}

/**
 * Stub hook — Plan 1d.
 * Instantiates the analyzer worker and exposes the Comlink-wrapped API.
 * Plan 1e replaces this with a store-integrated version that handles
 * progress, error states, IDB cache hydration, and lifecycle.
 */
export function useAnalyzer(): AnalyzerHandle | null {
  const ref = useRef<AnalyzerHandle | null>(null)

  if (ref.current === null && typeof window !== 'undefined') {
    const worker = new Worker(
      new URL('../worker/analyzer.worker.ts', import.meta.url),
      { type: 'module' },
    )
    const api = Comlink.wrap<AnalyzerWorker>(worker)
    ref.current = {
      api,
      terminate: () => {
        worker.terminate()
      },
    }
  }

  useEffect(() => {
    return () => {
      ref.current?.terminate()
      ref.current = null
    }
  }, [])

  return ref.current
}

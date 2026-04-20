'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Generic query parameter sync for tool state.
 *
 * `schema` maps param names to serialize/parse functions.
 * Only params that differ from defaults are written to the URL.
 */

interface ParamDef<T> {
  /** Read from URL string → value, return undefined if invalid */
  parse: (raw: string) => T | undefined
  /** Write value → URL string */
  serialize: (val: T) => string
  /** Default value (omitted from URL when equal) */
  default: T
  /** Optional custom equality — defaults to `===`. */
  equals?: (a: T, b: T) => boolean
}

export type ParamSchema = Record<string, ParamDef<unknown>>

/** Parse URL search params using a schema. Returns partial state with only valid overrides. */
export function parseQueryState<S extends Record<string, unknown>>(schema: { [K in keyof S]: ParamDef<S[K]> }): Partial<S> {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const result: Partial<S> = {}
  for (const key in schema) {
    const raw = params.get(key)
    if (raw === null) continue
    const val = schema[key].parse(raw)
    if (val !== undefined) {
      (result as Record<string, unknown>)[key] = val
    }
  }
  return result
}

/** Build a query string from state, omitting defaults. */
export function stateToQuery<S extends Record<string, unknown>>(state: S, schema: { [K in keyof S]: ParamDef<S[K]> }): string {
  const parts: string[] = []
  for (const key in schema) {
    const def = schema[key]
    const val = state[key]
    const isDefault = def.equals ? def.equals(val, def.default) : val === def.default
    if (!isDefault) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(def.serialize(val)).replace(/%2B/gi, '+')}`)
    }
  }
  return parts.join('&')
}

/** Sync state to URL query params (replaceState). Skips first render. Throttled to stay under browser limits (Safari: 100 calls / 10s). */
export function useToolQuerySync<S extends Record<string, unknown>>(state: S, schema: { [K in keyof S]: ParamDef<S[K]> }): void {
  const isFirst = useRef(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const qs = stateToQuery(state, schema)
  const qsRef = useRef(qs)
  qsRef.current = qs
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    if (timerRef.current) return
    timerRef.current = setTimeout(() => {
      const url = qsRef.current ? `${window.location.pathname}?${qsRef.current}` : window.location.pathname
      window.history.replaceState(null, '', url)
      timerRef.current = null
    }, 200)
  }, [qs])
  useEffect(() => () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null } }, [])
}

/**
 * Hook that parses URL params after hydration and applies them via setters.
 * Returns true once hydration is complete.
 * Call this ONCE in each tool component, passing a map of param key → setter.
 */
// Schema types and React setState types (Dispatch<SetStateAction<T>>) can't be
// unified generically — schema infers T while setState accepts T | (prev => T).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useQueryInit(schema: Record<string, ParamDef<any>>, setters: Record<string, (val: any) => void>): boolean {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    if (hydrated) return
    const params = new URLSearchParams(window.location.search)
    for (const key in schema) {
      const raw = params.get(key)
      if (raw === null) continue
      const val = schema[key].parse(raw)
      if (val !== undefined) {
        setters[key](val)
      }
    }
    setHydrated(true)
  }, [hydrated, schema, setters])
  return hydrated
}

// ── Common param builders ──

export function numParam(defaultVal: number, min: number, max: number): ParamDef<number> {
  return {
    default: defaultVal,
    parse: (raw) => { const n = Number(raw); return !isNaN(n) && n >= min && n <= max ? n : undefined },
    serialize: (v) => String(v),
  }
}

export function intParam(defaultVal: number, min: number, max: number): ParamDef<number> {
  return {
    default: defaultVal,
    parse: (raw) => { const n = Math.round(Number(raw)); return !isNaN(n) && n >= min && n <= max ? n : undefined },
    serialize: (v) => String(v),
  }
}

export function strParam<T extends string>(defaultVal: T, allowed: readonly T[]): ParamDef<T> {
  const set = new Set<string>(allowed)
  return {
    default: defaultVal,
    parse: (raw) => set.has(raw) ? raw as T : undefined,
    serialize: (v) => v,
  }
}

export function sensorParam(defaultVal: string = 'ff'): ParamDef<string> {
  return {
    default: defaultVal,
    parse: (raw) => raw || undefined,
    serialize: (v) => v,
  }
}

export function idSetParam(defaultIds: readonly string[]): ParamDef<Set<string>> {
  const defaultSet = new Set(defaultIds)
  return {
    default: defaultSet,
    parse: (raw) => {
      if (!raw) return undefined
      const ids = raw.split(/[+, ]+/).filter(Boolean)
      return ids.length > 0 ? new Set(ids) : undefined
    },
    serialize: (v) => Array.from(v).sort().join('+'),
    equals: (a, b) =>
      a.size === b.size && [...a].every(x => b.has(x)),
  }
}

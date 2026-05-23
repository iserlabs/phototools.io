import sqlite3InitModule, { type Sqlite3Static, type Database } from '@sqlite.org/sqlite-wasm'

// m-1 (audit): The aggregator `DbLike` interface (`selectObject` / `selectObjects`)
// is satisfied directly by the sqlite-wasm oo1 `Database` class returned here —
// see its `selectObject(sql, bind)` / `selectObjects(sql, bind)` methods
// (true as of `@sqlite.org/sqlite-wasm@^3.50`). Aggregators can consume this
// handle without an adapter; the better-sqlite3 adapter in tests mirrors the
// same surface.

// The bundled `.d.mts` declares the init function as taking 0 arguments, but at
// runtime it accepts an Emscripten module config (e.g. `print` / `printErr` to
// silence console noise). Cast to a config-accepting signature to bridge the gap.
const initSqlite = sqlite3InitModule as (config?: {
  print?: (msg: string) => void
  printErr?: (msg: string) => void
}) => Promise<Sqlite3Static>

let initPromise: Promise<Sqlite3Static> | null = null
function getSqlite(): Promise<Sqlite3Static> {
  if (!initPromise) {
    initPromise = initSqlite({ print: () => {}, printErr: () => {} })
  }
  return initPromise
}

export class UnsupportedCatalogError extends Error {
  constructor(public readonly kind: 'not-sqlite' | 'schema-too-old' | 'not-lrc-classic' | 'corrupt') {
    super(`Unsupported catalog: ${kind}`)
    this.name = 'UnsupportedCatalogError'
  }
}

const SQLITE_HEADER = new Uint8Array([
  0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66,
  0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00,
])
const MIN_LRC_VERSION = 9

/**
 * Open a Lightroom catalog from an ArrayBuffer.
 * Validates the SQLite header, deserializes into sqlite-wasm read-only,
 * probes the schema version, rejects anything older than LrC 9.
 *
 * @returns the open `Database` handle and detected catalog version (e.g. 14).
 */
export async function openCatalog(buf: ArrayBuffer): Promise<{ db: Database; catalogVersion: number }> {
  // 1. Header check
  const headerBytes = new Uint8Array(buf, 0, Math.min(16, buf.byteLength))
  for (let i = 0; i < SQLITE_HEADER.length; i++) {
    if (headerBytes[i] !== SQLITE_HEADER[i]) throw new UnsupportedCatalogError('not-sqlite')
  }

  // 2. Initialize sqlite-wasm
  const sqlite3 = await getSqlite()

  // 3. Allocate WASM-side memory and copy bytes in.
  const len = buf.byteLength
  const ptr = sqlite3.wasm.alloc(len)
  sqlite3.wasm.heap8u().set(new Uint8Array(buf), ptr)

  // 4. Open an empty in-memory DB, then deserialize the bytes into it.
  //
  // NOTE: we deliberately do NOT pass SQLITE_DESERIALIZE_READONLY. The worker
  // (Plan 1d, Audit M-2) needs to CREATE a derived `AgSensorCropFactor` table
  // in this handle to drive the focal-length 35mm-equivalent normalization.
  // This only mutates the in-memory deserialized copy — SQLITE_DESERIALIZE_FREEONCLOSE
  // frees it on close and the user's original .lrcat file is never written to.
  const db = new sqlite3.oo1.DB(':memory:', 'c')
  const flags = sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE
  const rc = sqlite3.capi.sqlite3_deserialize(db.pointer!, 'main', ptr, len, len, flags)
  if (rc !== sqlite3.capi.SQLITE_OK) {
    sqlite3.wasm.dealloc(ptr)
    db.close()
    throw new UnsupportedCatalogError('corrupt')
  }

  // 5. Schema probe
  let catalogVersion: number
  try {
    const row = db.selectObject(
      `SELECT CAST(value AS INTEGER) AS v FROM Adobe_variablesTable WHERE name='Adobe_DBVersion'`,
    ) as { v: number } | undefined
    if (!row) throw new UnsupportedCatalogError('not-lrc-classic')
    catalogVersion = row.v
  } catch (e) {
    db.close()
    if (e instanceof UnsupportedCatalogError) throw e
    throw new UnsupportedCatalogError('not-lrc-classic')
  }

  if (catalogVersion < MIN_LRC_VERSION) {
    db.close()
    throw new UnsupportedCatalogError('schema-too-old')
  }

  return { db, catalogVersion }
}

export type { Database } from '@sqlite.org/sqlite-wasm'

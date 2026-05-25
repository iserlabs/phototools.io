import sqlite3InitModule, {
  type Sqlite3Static,
  type Database,
} from '@sqlite.org/sqlite-wasm'

// m-1 (audit): the aggregator `DbLike` interface is satisfied directly by the
// sqlite-wasm oo1 `Database` returned here; tests mirror it via better-sqlite3.

// The bundled `.d.mts` declares init as taking 0 args, but at runtime it accepts
// an Emscripten config (`print`/`printErr` to silence console noise). Cast to a
// config-accepting signature to bridge the gap.
const initSqlite = sqlite3InitModule as (config?: {
  print?: (msg: string) => void
  printErr?: (msg: string) => void
}) => Promise<Sqlite3Static>

let initPromise: Promise<Sqlite3Static> | null = null
export function getSqlite(): Promise<Sqlite3Static> {
  if (!initPromise) {
    initPromise = initSqlite({ print: () => {}, printErr: () => {} })
  }
  return initPromise
}

export class UnsupportedCatalogError extends Error {
  constructor(public readonly kind: 'not-sqlite' | 'schema-too-old' | 'not-lrc-classic' | 'corrupt' | 'too-large') {
    super(`Unsupported catalog: ${kind}`)
    this.name = 'UnsupportedCatalogError'
  }
}

const SQLITE_HEADER = new Uint8Array([
  0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66,
  0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00,
])
const MIN_LRC_VERSION = 9

export function assertSqliteHeader(headerBytes: Uint8Array): void {
  for (let i = 0; i < SQLITE_HEADER.length; i++) {
    if (headerBytes[i] !== SQLITE_HEADER[i]) throw new UnsupportedCatalogError('not-sqlite')
  }
}

/**
 * Read the LrC schema version from an open handle, rejecting non-Lightroom or
 * too-old catalogs. Closes the handle before throwing so callers don't leak it.
 */
export function probeCatalogVersion(db: Database): number {
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
  return catalogVersion
}

/**
 * Open a Lightroom catalog from an ArrayBuffer (in-memory `sqlite3_deserialize`).
 * For catalogs that fit in one buffer — the bundled demo, tests, and the OPFS
 * fallback. Larger catalogs go through `openCatalogFromFile`.
 */
export async function openCatalog(buf: ArrayBuffer): Promise<{ db: Database; catalogVersion: number }> {
  assertSqliteHeader(new Uint8Array(buf, 0, Math.min(16, buf.byteLength)))
  const sqlite3 = await getSqlite()

  // Over-allocate (data + headroom) so the deserialized DB can grow for the
  // derived AgSensorCropFactor table; RESIZEABLE lets SQLite realloc past it,
  // FREEONCLOSE frees on close. The user's original .lrcat is never written.
  const len = buf.byteLength
  const HEADROOM = 1024 * 1024 // 1 MB spare pages for the derived crop-factor table
  const cap = len + HEADROOM
  const ptr = sqlite3.wasm.alloc(cap)
  sqlite3.wasm.heap8u().set(new Uint8Array(buf), ptr)

  const db = new sqlite3.oo1.DB(':memory:', 'c')
  const flags =
    sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE |
    sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE
  const rc = sqlite3.capi.sqlite3_deserialize(db.pointer!, 'main', ptr, len, cap, flags)
  if (rc !== sqlite3.capi.SQLITE_OK) {
    sqlite3.wasm.dealloc(ptr)
    db.close()
    throw new UnsupportedCatalogError('corrupt')
  }

  return { db, catalogVersion: probeCatalogVersion(db) }
}

export type { Database } from '@sqlite.org/sqlite-wasm'

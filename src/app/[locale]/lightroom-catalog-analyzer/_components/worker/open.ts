import sqlite3InitModule, {
  type Sqlite3Static,
  type Database,
  type SAHPoolUtil,
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
function getSqlite(): Promise<Sqlite3Static> {
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

function assertSqliteHeader(headerBytes: Uint8Array): void {
  for (let i = 0; i < SQLITE_HEADER.length; i++) {
    if (headerBytes[i] !== SQLITE_HEADER[i]) throw new UnsupportedCatalogError('not-sqlite')
  }
}

/**
 * Read the LrC schema version from an open handle, rejecting non-Lightroom or
 * too-old catalogs. Closes the handle before throwing so callers don't leak it.
 */
function probeCatalogVersion(db: Database): number {
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

// OPFS SAH-Pool streaming path — for catalogs too large for one buffer (V8 caps
// ArrayBuffer ~2 GB). Stream the file to disk-backed OPFS and let SQLite page
// from disk via the SAH-Pool VFS, which (unlike the plain `opfs` VFS) needs no
// SharedArrayBuffer / COOP-COEP isolation, so our headers (and ads) are untouched.

const OPFS_DIR = '/phototools-lrcat'
const OPFS_DB_PATH = `${OPFS_DIR}/catalog.lrcat`

// SAH-Pool is backed by one FileSystemSyncAccessHandle, whose read/write `at`
// offset is truncated to 32 bits in current Chromium — so a DB crossing 2 GB
// (2^31) corrupts silently (writes past 2 GB wrap onto earlier pages). Cap below
// 2^31 with headroom for the crop-factor table added after open (verified:
// 1.9 GB opens cleanly, 2.4 GB corrupts); larger catalogs get a "too large" msg.
const MAX_OPFS_BYTES = 2_080_000_000

let poolPromise: Promise<SAHPoolUtil | null> | null = null

async function getPool(sqlite3: Sqlite3Static): Promise<SAHPoolUtil | null> {
  if (typeof sqlite3.installOpfsSAHPoolVfs !== 'function') return null
  if (!poolPromise) {
    // Wrap in async so both sync and async failures (e.g. no OPFS in Node) → null.
    poolPromise = (async () => {
      try {
        return await sqlite3.installOpfsSAHPoolVfs({
          name: 'phototools-lrcat',
          directory: OPFS_DIR,
          initialCapacity: 4,
        })
      } catch {
        return null
      }
    })()
  }
  return poolPromise
}

/**
 * Open a catalog by streaming the File into OPFS and opening it with the
 * SAH-Pool VFS (SQLite pages from disk — bounded memory, handles multi-GB
 * catalogs). Returns `null` if OPFS is unavailable so the caller can fall back
 * to the in-memory `openCatalog` path.
 */
export async function openCatalogFromFile(
  file: File,
  onBytes?: (read: number, total: number) => void,
): Promise<{ db: Database; catalogVersion: number } | null> {
  // Reject catalogs that would cross the SAH-Pool 2 GB boundary up front, before
  // a long doomed import — they'd corrupt silently (see MAX_OPFS_BYTES).
  if (file.size >= MAX_OPFS_BYTES) throw new UnsupportedCatalogError('too-large')

  // Cheap header probe (16 bytes) before committing to a full disk import.
  assertSqliteHeader(new Uint8Array(await file.slice(0, 16).arrayBuffer()))

  const sqlite3 = await getSqlite()
  const pool = await getPool(sqlite3)
  if (!pool) return null

  // Clear any leftover from a previous (possibly crashed) session, then stream
  // the file's bytes straight to the OPFS-backed handle — never buffering the
  // whole file in memory.
  try { pool.unlink(OPFS_DB_PATH) } catch { /* nothing to remove */ }
  const reader = file.stream().getReader()
  let read = 0
  try {
    await pool.importDb(OPFS_DB_PATH, async () => {
      const { done, value } = await reader.read()
      if (done || !value) return undefined
      read += value.byteLength
      onBytes?.(read, file.size)
      return value
    })
  } catch (e) {
    try { pool.unlink(OPFS_DB_PATH) } catch { /* best effort */ }
    // importDb validates the SQLite header; a non-DB or truncated file lands here.
    throw e instanceof UnsupportedCatalogError ? e : new UnsupportedCatalogError('corrupt')
  }

  const db = new pool.OpfsSAHPoolDb(OPFS_DB_PATH) as unknown as Database
  // Ephemeral analysis copy — no durability needed. journal_mode=OFF also avoids
  // consuming extra pool file slots for a rollback journal when the worker
  // creates the derived AgSensorCropFactor table.
  try { db.exec('PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF;') } catch { /* non-fatal */ }

  try {
    return { db, catalogVersion: probeCatalogVersion(db) }
  } catch (e) {
    try { pool.unlink(OPFS_DB_PATH) } catch { /* best effort */ }
    throw e
  }
}

/** Remove the streamed catalog copy from OPFS (privacy + storage reclaim). */
export async function wipeOpfsCatalog(): Promise<void> {
  const pool = poolPromise ? await poolPromise : null
  if (pool) {
    try { pool.unlink(OPFS_DB_PATH) } catch { /* best effort */ }
  }
}

export type { Database } from '@sqlite.org/sqlite-wasm'

import type { Database, SAHPoolUtil, Sqlite3Static } from '@sqlite.org/sqlite-wasm'
import {
  getSqlite,
  assertSqliteHeader,
  probeCatalogVersion,
  UnsupportedCatalogError,
} from './open'

// OPFS SAH-Pool streaming path — for catalogs too large for one buffer (V8 caps
// ArrayBuffer ~2 GB). Stream to disk-backed OPFS and let SQLite page from disk
// via SAH-Pool, which needs no SharedArrayBuffer/COOP-COEP, so ads are untouched.
//
// SAH-Pool grabs EXCLUSIVE sync access handles on its backing files at install.
// A fixed directory therefore deadlocks across reloads/tabs/zombie workers
// ("Access Handles cannot be created if there is another open Access Handle").
// So each worker instance uses its OWN uniquely-named pool dir — nothing to
// collide on — and we sweep pools left by dead sessions on first use.
const POOL_PREFIX = 'phototools-lrcat-'
const POOL_NAME = `${POOL_PREFIX}${Math.random().toString(36).slice(2, 10)}`
const POOL_DIR = `/${POOL_NAME}`
const DB_PATH = `${POOL_DIR}/catalog.lrcat`

// Streaming to OPFS needs ~the file's own size on disk; leave margin for the
// SAH-Pool's spare slots + the derived crop-factor table. Files that can't fit
// the storage quota fail fast (rather than a partial import → later corruption).
const MARGIN_BYTES = 256 * 1024 * 1024

type OpfsRoot = FileSystemDirectoryHandle & {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>
}

let poolPromise: Promise<SAHPoolUtil | null> | null = null

/** Remove pool dirs left by dead/abandoned sessions. Dirs a live worker still
 *  holds throw on removeEntry and are skipped — so this never disturbs others. */
async function sweepStalePools(): Promise<void> {
  try {
    const root = (await navigator.storage.getDirectory()) as OpfsRoot
    for await (const [name, handle] of root.entries()) {
      if (handle.kind === 'directory' && name.startsWith(POOL_PREFIX) && name !== POOL_NAME) {
        await root.removeEntry(name, { recursive: true }).catch(() => {})
      }
    }
  } catch { /* listing unavailable — non-fatal */ }
}

async function getPool(sqlite3: Sqlite3Static): Promise<SAHPoolUtil | null> {
  if (typeof sqlite3.installOpfsSAHPoolVfs !== 'function') return null
  if (!poolPromise) {
    // Wrap in async so both sync and async failures (e.g. no OPFS in Node) → null.
    poolPromise = (async () => {
      await sweepStalePools()
      try {
        return await sqlite3.installOpfsSAHPoolVfs({
          name: POOL_NAME,
          directory: POOL_DIR,
          initialCapacity: 4,
          clearOnInit: true,
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
  // Reject up front if the file can't fit in OPFS storage (modern Chrome handles
  // multi-GB files and >2 GB offsets fine, so size is bounded only by quota).
  const est = await navigator.storage?.estimate?.().catch(() => null)
  if (est?.quota && file.size > est.quota - MARGIN_BYTES) {
    throw new UnsupportedCatalogError('too-large')
  }

  // Cheap header probe (16 bytes) before committing to a full disk import.
  assertSqliteHeader(new Uint8Array(await file.slice(0, 16).arrayBuffer()))

  const sqlite3 = await getSqlite()
  const pool = await getPool(sqlite3)
  if (!pool) return null

  // Stream the file's bytes straight to the OPFS-backed handle — never buffering
  // the whole file in memory.
  const reader = file.stream().getReader()
  let read = 0
  try {
    await pool.importDb(DB_PATH, async () => {
      const { done, value } = await reader.read()
      if (done || !value) return undefined
      read += value.byteLength
      onBytes?.(read, file.size)
      return value
    })
  } catch (e) {
    try { pool.unlink(DB_PATH) } catch { /* best effort */ }
    // importDb validates the SQLite header; a non-DB or truncated file lands here.
    throw e instanceof UnsupportedCatalogError ? e : new UnsupportedCatalogError('corrupt')
  }

  const db = new pool.OpfsSAHPoolDb(DB_PATH) as unknown as Database
  // Ephemeral analysis copy — no durability needed. journal_mode=OFF also avoids
  // consuming extra pool file slots for a rollback journal when the worker
  // creates the derived AgSensorCropFactor table.
  try { db.exec('PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF;') } catch { /* non-fatal */ }

  try {
    return { db, catalogVersion: probeCatalogVersion(db) }
  } catch (e) {
    try { pool.unlink(DB_PATH) } catch { /* best effort */ }
    throw e
  }
}

/**
 * Tear down this worker's OPFS pool — release the SAH handles and delete the
 * whole pool directory so an abandoned session never leaves multi-GB backing
 * files behind (privacy + storage reclaim). Called on `close()`.
 */
export async function wipeOpfsCatalog(): Promise<void> {
  const pool = poolPromise ? await poolPromise : null
  poolPromise = null
  if (!pool) return
  try { pool.unlink(DB_PATH) } catch { /* best effort */ }
  try { await pool.removeVfs() } catch { /* best effort */ }
  try {
    const root = await navigator.storage.getDirectory()
    await root.removeEntry(POOL_NAME, { recursive: true })
  } catch { /* best effort */ }
}

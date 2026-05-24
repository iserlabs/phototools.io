/**
 * Read a user-selected `.lrcat` into an ArrayBuffer.
 *
 * The naive approach — `FileReader.readAsArrayBuffer(file)` or
 * `file.arrayBuffer()` — reads the whole file in a single shot. On Chrome/macOS
 * that throws `NotReadableError` for large files (real Lightroom catalogs are
 * routinely hundreds of MB to several GB). Streaming the file in chunks via
 * `Blob.stream()` avoids the one giant read and reliably handles big catalogs —
 * the same approach robust catalog readers use.
 *
 * We pre-allocate one buffer of `file.size` and fill it as chunks arrive, so the
 * result is a single contiguous ArrayBuffer ready for `sqlite3_deserialize`.
 */
async function readStreaming(file: File): Promise<ArrayBuffer> {
  const buffer = new ArrayBuffer(file.size)
  const out = new Uint8Array(buffer)
  let offset = 0
  const reader = file.stream().getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (offset + value.length > out.length) {
        // The file grew past its reported size mid-read — refuse rather than
        // silently overflow. (Shouldn't happen for a static catalog file.)
        throw new DOMException('file changed during read', 'NotReadableError')
      }
      out.set(value, offset)
      offset += value.length
    }
  } finally {
    reader.releaseLock()
  }
  // If the file reported more bytes than it delivered, hand back only what we
  // actually read so the SQLite header check sees real data.
  return offset === buffer.byteLength ? buffer : buffer.slice(0, offset)
}

function readViaFileReader(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Read the catalog bytes, preferring the chunked stream. Falls back to the
 * one-shot APIs only when `Blob.stream` is unavailable (very old engines).
 */
export async function readCatalogBytes(file: File): Promise<ArrayBuffer> {
  if (typeof file.stream === 'function') {
    return readStreaming(file)
  }
  try {
    return await file.arrayBuffer()
  } catch {
    return readViaFileReader(file)
  }
}

/** Normalize an unknown thrown value into a `{ name, message }` pair for display. */
export function describeError(err: unknown): { name: string; message: string } {
  if (err instanceof Error) return { name: err.name || 'Error', message: err.message || '' }
  return { name: 'unknown', message: String(err) }
}

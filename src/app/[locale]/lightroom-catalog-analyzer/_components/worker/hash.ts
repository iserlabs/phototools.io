const SAMPLE_BYTES = 64 * 1024  // 64 KB

/**
 * Stable, cheap hash of a catalog for IDB cache keying.
 * Combines file size + lastModified + first 64KB content hash via SHA-256.
 * Avoids hashing the full 2 GB file (too slow); collisions are extremely
 * unlikely for the (size, lastModified, head-bytes) tuple.
 */
export async function computeCatalogHash(
  buf: ArrayBuffer,
  size: number,
  lastModified: number,
): Promise<string> {
  const sampleLen = Math.min(SAMPLE_BYTES, buf.byteLength)
  const sample = new Uint8Array(buf, 0, sampleLen)

  // Pack metadata as little-endian bytes prepended to the sample.
  const metaBuf = new ArrayBuffer(16)
  const metaView = new DataView(metaBuf)
  metaView.setFloat64(0, size, true)            // safe: size fits in float64
  metaView.setFloat64(8, lastModified, true)

  const combined = new Uint8Array(16 + sampleLen)
  combined.set(new Uint8Array(metaBuf), 0)
  combined.set(sample, 16)

  const digest = await crypto.subtle.digest('SHA-256', combined)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

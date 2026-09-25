/**
 * Extract and transfer EXIF metadata between JPEG files.
 *
 * JPEG structure: FF D8 (SOI) followed by segments.
 * Each segment: FF XX (marker) + 2-byte length + data.
 * APP1 (FF E1) carries EXIF and XMP metadata.
 */

const SOI = 0xffd8
const SOS = 0xffda
const APP1 = 0xffe1

function isJpeg(mimeType: string): boolean {
  return mimeType === 'image/jpeg' || mimeType === 'image/jpg'
}

/** Extract all APP1 (EXIF/XMP) segments from a JPEG buffer as sliced ArrayBuffers. */
export function extractApp1Segments(jpeg: ArrayBuffer): ArrayBuffer[] {
  const view = new DataView(jpeg)
  const segments: ArrayBuffer[] = []

  if (view.byteLength < 4 || view.getUint16(0) !== SOI) return segments

  let offset = 2
  while (offset + 3 < view.byteLength) {
    const marker = view.getUint16(offset)
    if (marker === SOS) break
    if ((marker & 0xff00) !== 0xff00) break

    const segLen = view.getUint16(offset + 2)
    const totalLen = 2 + segLen // marker(2) is separate from length field

    if (marker === APP1) {
      segments.push(jpeg.slice(offset, offset + totalLen))
    }

    offset += totalLen
  }

  return segments
}

/**
 * Read a picked JPEG's APP1 segments up front, while the file is certainly
 * readable. Frame Studio calls this at upload time and carries only these few
 * KB to export, so export never touches the File again: Safari rejects
 * `File.arrayBuffer()` with `NotFoundError: The object can not be found here.`
 * once a picked file has stopped being readable (PHOTOTOOLS-13 — the second
 * export of the same photo, 35 minutes into the session). Non-JPEGs carry
 * nothing, so they are never read.
 */
export async function readExifSegments(file: Blob, mimeType: string): Promise<ArrayBuffer[]> {
  if (!isJpeg(mimeType)) return []
  return extractApp1Segments(await file.arrayBuffer())
}

/**
 * Insert previously extracted APP1 segments (see `readExifSegments`) into an
 * exported JPEG blob. Returns the blob unchanged for non-JPEG types or when
 * there is nothing to carry.
 */
export async function transferExifSegments(
  exifSegments: ArrayBuffer[],
  exportedBlob: Blob,
  mimeType: string,
): Promise<Blob> {
  if (!isJpeg(mimeType)) return exportedBlob
  if (exifSegments.length === 0) return exportedBlob

  const exportedBuffer = await exportedBlob.arrayBuffer()
  const exportedView = new DataView(exportedBuffer)
  if (exportedView.byteLength < 2 || exportedView.getUint16(0) !== SOI) return exportedBlob

  // Insert EXIF segments right after SOI (FF D8)
  const parts: ArrayBuffer[] = [
    exportedBuffer.slice(0, 2),
    ...exifSegments,
    exportedBuffer.slice(2),
  ]

  return new Blob(parts, { type: mimeType })
}

import { describe, it, expect, vi } from 'vitest'
import { extractApp1Segments, readExifSegments, transferExifSegments } from './exif'

/** Build a minimal JPEG with SOI + one segment + SOS stub. */
function makeJpeg(segments: { marker: number; data: Uint8Array }[]): ArrayBuffer {
  const parts: number[] = [0xff, 0xd8] // SOI
  for (const seg of segments) {
    parts.push((seg.marker >> 8) & 0xff, seg.marker & 0xff)
    const len = seg.data.length + 2
    parts.push((len >> 8) & 0xff, len & 0xff)
    parts.push(...seg.data)
  }
  parts.push(0xff, 0xda) // SOS marker
  parts.push(0x00, 0x02) // minimal SOS length
  return new Uint8Array(parts).buffer as ArrayBuffer
}

/** The original export path: extract from the source JPEG, then carry into the export. */
function transferExif(original: ArrayBuffer, exportedBlob: Blob, mimeType: string): Promise<Blob> {
  return transferExifSegments(extractApp1Segments(original), exportedBlob, mimeType)
}

describe('extract + transfer end to end', () => {
  it('returns blob unchanged for PNG', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })
    const result = await transferExif(new ArrayBuffer(0), blob, 'image/png')
    expect(result).toBe(blob)
  })

  it('returns blob unchanged when original has no APP1', async () => {
    const original = makeJpeg([{ marker: 0xffe0, data: new Uint8Array([0x4a, 0x46]) }])
    const exported = makeJpeg([])
    const exportedBlob = new Blob([exported], { type: 'image/jpeg' })

    const result = await transferExif(original, exportedBlob, 'image/jpeg')
    expect(result).toBe(exportedBlob)
  })

  it('inserts APP1 segment into exported JPEG', async () => {
    const exifData = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]) // "Exif\0\0"
    const original = makeJpeg([{ marker: 0xffe1, data: exifData }])
    const exported = makeJpeg([{ marker: 0xffe0, data: new Uint8Array([0x4a, 0x46]) }])
    const exportedBlob = new Blob([exported], { type: 'image/jpeg' })

    const result = await transferExif(original, exportedBlob, 'image/jpeg')
    const buf = await result.arrayBuffer()
    const view = new DataView(buf)

    // SOI still at offset 0
    expect(view.getUint16(0)).toBe(0xffd8)
    // APP1 inserted at offset 2
    expect(view.getUint16(2)).toBe(0xffe1)
    // Original APP0 follows after the APP1 segment
    const app1Len = view.getUint16(4)
    expect(view.getUint16(2 + 2 + app1Len)).toBe(0xffe0)
  })

  it('preserves multiple APP1 segments', async () => {
    const exif = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00])
    const xmp = new Uint8Array([0x58, 0x4d, 0x50, 0x00])
    const original = makeJpeg([
      { marker: 0xffe1, data: exif },
      { marker: 0xffe0, data: new Uint8Array([0x00]) }, // non-APP1 in between
      { marker: 0xffe1, data: xmp },
    ])
    const exported = makeJpeg([])
    const exportedBlob = new Blob([exported], { type: 'image/jpeg' })

    const result = await transferExif(original, exportedBlob, 'image/jpeg')
    const buf = await result.arrayBuffer()
    const view = new DataView(buf)

    // Both APP1 segments should be present after SOI
    expect(view.getUint16(2)).toBe(0xffe1)
    const firstLen = view.getUint16(4)
    expect(view.getUint16(2 + 2 + firstLen)).toBe(0xffe1)
  })
})

// Frame Studio reads the original's EXIF at UPLOAD time and carries only the
// APP1 segments to export, so the export never re-reads the File (PHOTOTOOLS-13:
// Safari rejects `File.arrayBuffer()` with `NotFoundError: The object can not
// be found here.` once the picked file is no longer readable — 35 minutes into
// the session, on the second export of the same photo).
describe('extractApp1Segments', () => {
  it('returns no segments for a non-JPEG buffer', () => {
    expect(extractApp1Segments(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toEqual([])
    expect(extractApp1Segments(new ArrayBuffer(0))).toEqual([])
  })

  it('returns no segments for a JPEG without APP1', () => {
    const jpeg = makeJpeg([{ marker: 0xffe0, data: new Uint8Array([0x4a, 0x46]) }])
    expect(extractApp1Segments(jpeg)).toEqual([])
  })

  it('returns each APP1 segment with its marker and length intact', () => {
    const exif = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00])
    const jpeg = makeJpeg([{ marker: 0xffe1, data: exif }])
    const [segment] = extractApp1Segments(jpeg)
    const view = new DataView(segment)
    expect(view.getUint16(0)).toBe(0xffe1)
    expect(view.getUint16(2)).toBe(exif.length + 2)
    expect(segment.byteLength).toBe(2 + 2 + exif.length)
  })
})

describe('transferExifSegments', () => {
  it('returns blob unchanged for PNG even when segments are supplied', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })
    const segments = extractApp1Segments(makeJpeg([{ marker: 0xffe1, data: new Uint8Array([0x45, 0x78]) }]))
    expect(await transferExifSegments(segments, blob, 'image/png')).toBe(blob)
  })

  it('returns blob unchanged when there are no segments to carry', async () => {
    const exportedBlob = new Blob([makeJpeg([])], { type: 'image/jpeg' })
    expect(await transferExifSegments([], exportedBlob, 'image/jpeg')).toBe(exportedBlob)
  })

  it('inserts the carried segments right after SOI', async () => {
    const exif = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00])
    const segments = extractApp1Segments(makeJpeg([{ marker: 0xffe1, data: exif }]))
    const exportedBlob = new Blob([makeJpeg([{ marker: 0xffe0, data: new Uint8Array([0x4a, 0x46]) }])], { type: 'image/jpeg' })

    const result = await transferExifSegments(segments, exportedBlob, 'image/jpeg')
    const view = new DataView(await result.arrayBuffer())
    expect(view.getUint16(0)).toBe(0xffd8)
    expect(view.getUint16(2)).toBe(0xffe1)
    const app1Len = view.getUint16(4)
    expect(view.getUint16(2 + 2 + app1Len)).toBe(0xffe0)
  })
})

describe('readExifSegments', () => {
  it('reads the APP1 segments of a JPEG blob', async () => {
    const exif = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0x00, 0x00])
    const blob = new Blob([makeJpeg([{ marker: 0xffe1, data: exif }])], { type: 'image/jpeg' })
    const segments = await readExifSegments(blob, 'image/jpeg')
    expect(segments).toHaveLength(1)
    expect(new DataView(segments[0]).getUint16(0)).toBe(0xffe1)
  })

  it('never reads a non-JPEG', async () => {
    const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' })
    const read = vi.spyOn(blob, 'arrayBuffer')
    expect(await readExifSegments(blob, 'image/png')).toEqual([])
    expect(read).not.toHaveBeenCalled()
  })

  it('propagates a read failure so the caller can decide', async () => {
    const blob = new Blob([makeJpeg([])], { type: 'image/jpeg' })
    vi.spyOn(blob, 'arrayBuffer').mockRejectedValue(new DOMException('The object can not be found here.', 'NotFoundError'))
    await expect(readExifSegments(blob, 'image/jpeg')).rejects.toThrow('The object can not be found here.')
  })
})

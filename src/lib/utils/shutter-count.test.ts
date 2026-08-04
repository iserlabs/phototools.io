import { describe, it, expect } from 'vitest'
import { extractShutterCount } from './shutter-count'

/**
 * Synthetic EXIF fixture builder (little-endian TIFF).
 *
 * Layout (offsets relative to TIFF base):
 *   0   TIFF header (II 42, IFD0 at 8)
 *   8   IFD0: 1 entry (ExifIFD pointer -> 26)
 *   26  ExifIFD: up to 2 entries + data area after
 */
interface FixtureOpts {
  nikonShutterCount?: number
  nikonMechanicalCount?: number
  imageNumber?: number
}

function buildNikonMakerNote(opts: FixtureOpts): Uint8Array {
  const entries: Array<{ tag: number; value: number }> = []
  if (opts.nikonShutterCount !== undefined) entries.push({ tag: 0x00a7, value: opts.nikonShutterCount })
  if (opts.nikonMechanicalCount !== undefined) entries.push({ tag: 0x00bd, value: opts.nikonMechanicalCount })

  const ifdLen = 2 + entries.length * 12 + 4
  const mn = new Uint8Array(10 + 8 + ifdLen)
  const view = new DataView(mn.buffer)
  mn.set([0x4e, 0x69, 0x6b, 0x6f, 0x6e, 0x00, 0x02, 0x10, 0x00, 0x00]) // "Nikon\0" v2.10
  // Embedded TIFF header at byte 10
  view.setUint16(10, 0x4949)
  view.setUint16(12, 42, true)
  view.setUint32(14, 8, true) // IFD at embedded-base + 8
  view.setUint16(18, entries.length, true)
  entries.forEach((e, i) => {
    const at = 20 + i * 12
    view.setUint16(at, e.tag, true)
    view.setUint16(at + 2, 4, true) // LONG
    view.setUint32(at + 4, 1, true)
    view.setUint32(at + 8, e.value, true)
  })
  return mn
}

function buildTiff(opts: FixtureOpts): Uint8Array {
  const makerNote = opts.nikonShutterCount !== undefined || opts.nikonMechanicalCount !== undefined
    ? buildNikonMakerNote(opts)
    : null

  const exifEntries: number = (makerNote ? 1 : 0) + (opts.imageNumber !== undefined ? 1 : 0)
  const exifIfdOffset = 26
  const exifIfdLen = 2 + exifEntries * 12 + 4
  const mnOffset = exifIfdOffset + exifIfdLen
  const total = mnOffset + (makerNote?.length ?? 0)

  const tiff = new Uint8Array(total)
  const view = new DataView(tiff.buffer)
  view.setUint16(0, 0x4949)
  view.setUint16(2, 42, true)
  view.setUint32(4, 8, true)

  // IFD0: single ExifIFD pointer entry
  view.setUint16(8, 1, true)
  view.setUint16(10, 0x8769, true)
  view.setUint16(12, 4, true) // LONG
  view.setUint32(14, 1, true)
  view.setUint32(18, exifIfdOffset, true)
  view.setUint32(22, 0, true) // next IFD

  // ExifIFD
  view.setUint16(exifIfdOffset, exifEntries, true)
  let at = exifIfdOffset + 2
  if (makerNote) {
    view.setUint16(at, 0x927c, true)
    view.setUint16(at + 2, 7, true) // UNDEFINED
    view.setUint32(at + 4, makerNote.length, true)
    view.setUint32(at + 8, mnOffset, true)
    at += 12
  }
  if (opts.imageNumber !== undefined) {
    view.setUint16(at, 0x9211, true)
    view.setUint16(at + 2, 4, true) // LONG
    view.setUint32(at + 4, 1, true)
    view.setUint32(at + 8, opts.imageNumber, true)
    at += 12
  }
  view.setUint32(at, 0, true) // next IFD

  if (makerNote) tiff.set(makerNote, mnOffset)
  return tiff
}

function wrapInJpeg(tiff: Uint8Array): ArrayBuffer {
  const exifBody = new Uint8Array(6 + tiff.length)
  exifBody.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]) // "Exif\0\0"
  exifBody.set(tiff, 6)

  const jpeg = new Uint8Array(2 + 4 + exifBody.length + 2)
  const view = new DataView(jpeg.buffer)
  view.setUint16(0, 0xffd8)
  view.setUint16(2, 0xffe1)
  view.setUint16(4, 2 + exifBody.length)
  jpeg.set(exifBody, 6)
  view.setUint16(jpeg.length - 2, 0xffd9)
  return jpeg.buffer
}

function asBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer
}

describe('extractShutterCount', () => {
  it('reads Nikon ShutterCount (0x00A7) from a raw TIFF (NEF-style) file', () => {
    const result = extractShutterCount(asBuffer(buildTiff({ nikonShutterCount: 48213 })))
    expect(result).toEqual({ count: 48213, source: 'shutterCount' })
  })

  it('reads Nikon ShutterCount from a JPEG APP1 Exif segment', () => {
    const result = extractShutterCount(wrapInJpeg(buildTiff({ nikonShutterCount: 105 })))
    expect(result).toEqual({ count: 105, source: 'shutterCount' })
  })

  it('prefers ShutterCount over MechanicalShutterCount when both exist', () => {
    const result = extractShutterCount(
      wrapInJpeg(buildTiff({ nikonShutterCount: 5000, nikonMechanicalCount: 4200 })),
    )
    expect(result).toEqual({ count: 5000, source: 'shutterCount' })
  })

  it('falls back to MechanicalShutterCount when ShutterCount is absent', () => {
    const result = extractShutterCount(wrapInJpeg(buildTiff({ nikonMechanicalCount: 777 })))
    expect(result).toEqual({ count: 777, source: 'mechanicalShutterCount' })
  })

  it('falls back to standard EXIF ImageNumber without a Nikon MakerNote', () => {
    const result = extractShutterCount(wrapInJpeg(buildTiff({ imageNumber: 31337 })))
    expect(result).toEqual({ count: 31337, source: 'imageNumber' })
  })

  it('ignores a zero ImageNumber (meaningless counter)', () => {
    const result = extractShutterCount(wrapInJpeg(buildTiff({ imageNumber: 0 })))
    expect(result).toEqual({ count: null, source: null })
  })

  it('returns nulls when EXIF exists but has no count tags', () => {
    const result = extractShutterCount(wrapInJpeg(buildTiff({})))
    expect(result).toEqual({ count: null, source: null })
  })

  it('returns nulls for a JPEG without an Exif APP1 segment', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
    expect(extractShutterCount(asBuffer(jpeg))).toEqual({ count: null, source: null })
  })

  it('returns nulls for non-image garbage', () => {
    const garbage = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05])
    expect(extractShutterCount(asBuffer(garbage))).toEqual({ count: null, source: null })
  })

  it('returns nulls for an empty buffer', () => {
    expect(extractShutterCount(new ArrayBuffer(0))).toEqual({ count: null, source: null })
  })

  it('survives a truncated MakerNote without throwing', () => {
    const tiff = buildTiff({ nikonShutterCount: 999 })
    const truncated = tiff.slice(0, tiff.length - 12)
    expect(() => extractShutterCount(asBuffer(truncated))).not.toThrow()
  })

  it('handles big-endian (MM) TIFF headers', () => {
    // Same structure as buildTiff but big-endian, ImageNumber only
    const tiff = new Uint8Array(42)
    const view = new DataView(tiff.buffer)
    view.setUint16(0, 0x4d4d)
    view.setUint16(2, 42, false)
    view.setUint32(4, 8, false)
    view.setUint16(8, 1, false)
    view.setUint16(10, 0x8769, false)
    view.setUint16(12, 4, false)
    view.setUint32(14, 1, false)
    view.setUint32(18, 26, false)
    view.setUint32(22, 0, false)
    view.setUint16(26, 1, false)
    view.setUint16(28, 0x9211, false)
    view.setUint16(30, 4, false)
    view.setUint32(32, 1, false)
    view.setUint32(36, 424242, false)
    const result = extractShutterCount(asBuffer(tiff))
    expect(result).toEqual({ count: 424242, source: 'imageNumber' })
  })
})

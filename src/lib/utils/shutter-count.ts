/**
 * Extract the camera shutter actuation count from image metadata, client-side.
 *
 * Shutter count is not part of standard EXIF — it lives in vendor MakerNotes.
 * Nikon stores it unencrypted (tag 0x00A7, plus 0x00BD MechanicalShutterCount
 * on Z bodies) inside a MakerNote that embeds its own TIFF structure. Canon
 * never writes it to files and Sony encrypts it, so for those brands the
 * standard EXIF ImageNumber tag (0x9211) is the only — approximate — signal.
 *
 * Works on JPEG (APP1 Exif segment) and TIFF-based files (NEF/DNG/TIFF).
 */

const JPEG_SOI = 0xffd8
const JPEG_SOS = 0xffda
const JPEG_APP1 = 0xffe1

const TAG_EXIF_IFD = 0x8769
const TAG_MAKER_NOTE = 0x927c
const TAG_IMAGE_NUMBER = 0x9211
const TAG_NIKON_SHUTTER_COUNT = 0x00a7
const TAG_NIKON_MECHANICAL_COUNT = 0x00bd

const TYPE_SHORT = 3
const TYPE_LONG = 4

export type ShutterCountSource = 'shutterCount' | 'mechanicalShutterCount' | 'imageNumber'

export interface ShutterCountResult {
  count: number | null
  source: ShutterCountSource | null
}

const EMPTY: ShutterCountResult = { count: null, source: null }

interface TiffContext {
  view: DataView
  /** Absolute offset of the TIFF header this context's IFD offsets are relative to */
  base: number
  little: boolean
}

function readTiffContext(view: DataView, base: number): TiffContext | null {
  if (base + 8 > view.byteLength) return null
  const order = view.getUint16(base)
  const little = order === 0x4949 // 'II'
  if (!little && order !== 0x4d4d) return null // 'MM'
  if (view.getUint16(base + 2, little) !== 42) return null
  return { view, base, little }
}

interface IfdEntry {
  tag: number
  type: number
  count: number
  /** Absolute offset of the entry's 4-byte value/offset slot */
  valueSlot: number
}

function readIfdEntries(ctx: TiffContext, ifdOffset: number): IfdEntry[] {
  const { view, base, little } = ctx
  const start = base + ifdOffset
  if (start + 2 > view.byteLength) return []
  const count = view.getUint16(start, little)
  const entries: IfdEntry[] = []
  for (let i = 0; i < count; i++) {
    const at = start + 2 + i * 12
    if (at + 12 > view.byteLength) break
    entries.push({
      tag: view.getUint16(at, little),
      type: view.getUint16(at + 2, little),
      count: view.getUint32(at + 4, little),
      valueSlot: at + 8,
    })
  }
  return entries
}

/** Read a single SHORT or LONG value (count 1 — always inline in the 4-byte slot). */
function readScalar(ctx: TiffContext, entry: IfdEntry): number | null {
  if (entry.count !== 1) return null
  if (entry.type === TYPE_SHORT) return ctx.view.getUint16(entry.valueSlot, ctx.little)
  if (entry.type === TYPE_LONG) return ctx.view.getUint32(entry.valueSlot, ctx.little)
  return null
}

function findEntry(entries: IfdEntry[], tag: number): IfdEntry | undefined {
  return entries.find((e) => e.tag === tag)
}

/** Locate the EXIF TIFF header: raw TIFF files at 0, JPEG via APP1 "Exif\0\0". */
function findTiffBase(view: DataView): number | null {
  if (view.byteLength < 4) return null
  const head = view.getUint16(0)
  if (head === 0x4949 || head === 0x4d4d) return 0 // NEF / DNG / TIFF
  if (head !== JPEG_SOI) return null

  let offset = 2
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset)
    if (marker === JPEG_SOS || (marker & 0xff00) !== 0xff00) break
    const segLen = view.getUint16(offset + 2)
    if (marker === JPEG_APP1 && offset + 10 <= view.byteLength) {
      // "Exif\0\0" identifier after the length field
      if (view.getUint32(offset + 4) === 0x45786966 && view.getUint16(offset + 8) === 0) {
        return offset + 10
      }
    }
    offset += 2 + segLen
  }
  return null
}

/** Nikon MakerNote: "Nikon\0" header, then an embedded TIFF structure at byte 10. */
function readNikonMakerNote(view: DataView, mnOffset: number): ShutterCountResult | null {
  if (mnOffset + 18 > view.byteLength) return null
  if (view.getUint32(mnOffset) !== 0x4e696b6f || view.getUint16(mnOffset + 4) !== 0x6e00) return null // "Nikon\0"
  const inner = readTiffContext(view, mnOffset + 10)
  if (!inner) return null
  const entries = readIfdEntries(inner, inner.view.getUint32(inner.base + 4, inner.little))
  const shutter = findEntry(entries, TAG_NIKON_SHUTTER_COUNT)
  if (shutter) {
    const count = readScalar(inner, shutter)
    if (count !== null) return { count, source: 'shutterCount' }
  }
  const mechanical = findEntry(entries, TAG_NIKON_MECHANICAL_COUNT)
  if (mechanical) {
    const count = readScalar(inner, mechanical)
    if (count !== null) return { count, source: 'mechanicalShutterCount' }
  }
  return null
}

export function extractShutterCount(buffer: ArrayBuffer): ShutterCountResult {
  try {
    const view = new DataView(buffer)
    const tiffBase = findTiffBase(view)
    if (tiffBase === null) return EMPTY

    const ctx = readTiffContext(view, tiffBase)
    if (!ctx) return EMPTY

    const ifd0 = readIfdEntries(ctx, view.getUint32(tiffBase + 4, ctx.little))
    const exifPointer = findEntry(ifd0, TAG_EXIF_IFD)
    if (!exifPointer) return EMPTY
    const exifOffset = readScalar(ctx, exifPointer)
    if (exifOffset === null) return EMPTY

    const exifEntries = readIfdEntries(ctx, exifOffset)

    const makerNote = findEntry(exifEntries, TAG_MAKER_NOTE)
    if (makerNote && makerNote.count > 4) {
      const mnOffset = tiffBase + ctx.view.getUint32(makerNote.valueSlot, ctx.little)
      const nikon = readNikonMakerNote(view, mnOffset)
      if (nikon) return nikon
    }

    const imageNumber = findEntry(exifEntries, TAG_IMAGE_NUMBER)
    if (imageNumber) {
      const count = readScalar(ctx, imageNumber)
      if (count !== null && count > 0) return { count, source: 'imageNumber' }
    }

    return EMPTY
  } catch {
    return EMPTY
  }
}

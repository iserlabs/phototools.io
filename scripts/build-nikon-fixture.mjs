#!/usr/bin/env node
/**
 * Generate the e2e fixture that exercises the real shutter-count read path.
 *
 * Why generated rather than a real camera file: an unedited NEF/JPEG carries the
 * photographer's body serial number, GPS, and capture time. This produces a file
 * with the same *structure* a Nikon body writes — a genuine APP1/TIFF/MakerNote
 * chain that exifreader and lib/utils/shutter-count.ts both parse for real — with
 * no personal data in it.
 *
 * What it proves that the unit tests don't: the unit tests call the parser
 * directly. This fixture drives the whole browser chain (FileDropZone →
 * FileReader → parser + exifreader → React state → rendered UI).
 *
 * Layout written here (little-endian TIFF), matching Nikon type-3 MakerNotes:
 *   APP1 "Exif\0\0" → TIFF header → IFD0 {Make, Model, ExifIFD*}
 *                                 → ExifIFD {MakerNote}
 *                                 → MakerNote "Nikon\0" + embedded TIFF
 *                                            → IFD {0x00A7 ShutterCount}
 *
 * Usage: node scripts/build-nikon-fixture.mjs
 */

import { readFileSync, writeFileSync } from 'fs'

const BASE_JPEG = 'src/e2e/fixtures/test-image.jpg'
const OUT = 'src/e2e/fixtures/nikon-shutter-count.jpg'

const MAKE = 'NIKON CORPORATION\0'
const MODEL = 'NIKON Z 8\0'
const SHUTTER_COUNT = 48213

const TYPE_ASCII = 2
const TYPE_LONG = 4
const TYPE_UNDEFINED = 7

/** Nikon type-3 MakerNote: "Nikon\0" + version + a self-contained little-endian TIFF. */
function buildNikonMakerNote(count) {
  const entries = 1
  const buf = Buffer.alloc(10 + 8 + 2 + entries * 12 + 4)
  buf.write('Nikon\0', 0, 'latin1')
  buf[6] = 0x02 // version 2.10
  buf[7] = 0x10
  // embedded TIFF header begins at byte 10; all offsets below are relative to it
  buf.write('II', 10, 'latin1')
  buf.writeUInt16LE(42, 12)
  buf.writeUInt32LE(8, 14) // IFD sits 8 bytes into the embedded TIFF
  // IFD entry is tag(2) + type(2) + count(4) + value(4) = 12 bytes, so the
  // value slot starts at 28 — not 26, which would overlap the count field.
  buf.writeUInt16LE(entries, 18)
  buf.writeUInt16LE(0x00a7, 20)     // ShutterCount
  buf.writeUInt16LE(TYPE_LONG, 22)
  buf.writeUInt32LE(1, 24)          // count
  buf.writeUInt32LE(count, 28)      // value
  buf.writeUInt32LE(0, 32)          // no next IFD
  return buf
}

function buildExifPayload() {
  const makerNote = buildNikonMakerNote(SHUTTER_COUNT)
  const makeBuf = Buffer.from(MAKE, 'latin1')
  const modelBuf = Buffer.from(MODEL, 'latin1')

  const IFD0_OFFSET = 8
  const IFD0_ENTRIES = 3
  const IFD0_LEN = 2 + IFD0_ENTRIES * 12 + 4
  const EXIF_IFD_OFFSET = IFD0_OFFSET + IFD0_LEN
  const EXIF_ENTRIES = 1
  const EXIF_IFD_LEN = 2 + EXIF_ENTRIES * 12 + 4

  // Data area holds anything wider than the 4-byte inline value slot.
  const makeOffset = EXIF_IFD_OFFSET + EXIF_IFD_LEN
  const modelOffset = makeOffset + makeBuf.length
  const mnOffset = modelOffset + modelBuf.length
  const total = mnOffset + makerNote.length

  const t = Buffer.alloc(total)
  t.write('II', 0, 'latin1')
  t.writeUInt16LE(42, 2)
  t.writeUInt32LE(IFD0_OFFSET, 4)

  // ── IFD0 ──
  let p = IFD0_OFFSET
  t.writeUInt16LE(IFD0_ENTRIES, p); p += 2
  const entry = (tag, type, count, value) => {
    t.writeUInt16LE(tag, p)
    t.writeUInt16LE(type, p + 2)
    t.writeUInt32LE(count, p + 4)
    t.writeUInt32LE(value, p + 8)
    p += 12
  }
  entry(0x010f, TYPE_ASCII, makeBuf.length, makeOffset)   // Make
  entry(0x0110, TYPE_ASCII, modelBuf.length, modelOffset) // Model
  entry(0x8769, TYPE_LONG, 1, EXIF_IFD_OFFSET)            // ExifIFD pointer
  t.writeUInt32LE(0, p); p += 4                            // no next IFD

  // ── ExifIFD ──
  p = EXIF_IFD_OFFSET
  t.writeUInt16LE(EXIF_ENTRIES, p); p += 2
  entry(0x927c, TYPE_UNDEFINED, makerNote.length, mnOffset) // MakerNote
  t.writeUInt32LE(0, p)

  makeBuf.copy(t, makeOffset)
  modelBuf.copy(t, modelOffset)
  makerNote.copy(t, mnOffset)

  return Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), t])
}

function main() {
  const base = readFileSync(BASE_JPEG)
  if (base.readUInt16BE(0) !== 0xffd8) throw new Error(`${BASE_JPEG} is not a JPEG`)

  const payload = buildExifPayload()
  const segment = Buffer.alloc(4 + payload.length)
  segment.writeUInt16BE(0xffe1, 0)              // APP1
  segment.writeUInt16BE(payload.length + 2, 2)  // length includes the length field
  payload.copy(segment, 4)

  // Splice APP1 immediately after SOI, keeping the rest of the base JPEG intact.
  const out = Buffer.concat([base.subarray(0, 2), segment, base.subarray(2)])
  writeFileSync(OUT, out)
  console.log(`wrote ${OUT} (${out.length} bytes), ShutterCount=${SHUTTER_COUNT}, Model=${MODEL.trim()}`)
}

main()

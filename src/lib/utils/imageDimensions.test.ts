import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { imageDimensions } from './imageDimensions'

const dirname = path.dirname(fileURLToPath(import.meta.url))

function pngHeader(width: number, height: number): Uint8Array {
  const data = new Uint8Array(30)
  data.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const view = new DataView(data.buffer)
  view.setUint32(8, 13) // IHDR length
  data.set([0x49, 0x48, 0x44, 0x52], 12) // "IHDR"
  view.setUint32(16, width)
  view.setUint32(20, height)
  return data
}

function jpegHeader(width: number, height: number): Uint8Array {
  // SOI, APP0 (16 bytes), SOF0 with dimensions
  const data = new Uint8Array(64)
  const view = new DataView(data.buffer)
  data.set([0xff, 0xd8]) // SOI
  data.set([0xff, 0xe0], 2) // APP0
  view.setUint16(4, 16) // APP0 length
  data.set([0xff, 0xc0], 20) // SOF0
  view.setUint16(22, 11) // SOF0 length
  view.setUint16(25, height)
  view.setUint16(27, width)
  return data
}

function gifHeader(width: number, height: number): Uint8Array {
  const data = new Uint8Array(30)
  data.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]) // "GIF89a"
  const view = new DataView(data.buffer)
  view.setUint16(6, width, true)
  view.setUint16(8, height, true)
  return data
}

function webpVp8Header(width: number, height: number): Uint8Array {
  const data = new Uint8Array(32)
  data.set([0x52, 0x49, 0x46, 0x46]) // "RIFF"
  data.set([0x57, 0x45, 0x42, 0x50], 8) // "WEBP"
  data.set([0x56, 0x50, 0x38, 0x20], 12) // "VP8 "
  data.set([0x9d, 0x01, 0x2a], 23) // keyframe start code
  const view = new DataView(data.buffer)
  view.setUint16(26, width, true)
  view.setUint16(28, height, true)
  return data
}

describe('imageDimensions', () => {
  it('reads PNG dimensions', () => {
    expect(imageDimensions(pngHeader(1200, 800))).toEqual({ width: 1200, height: 800 })
  })

  it('reads JPEG dimensions from the SOF0 marker', () => {
    expect(imageDimensions(jpegHeader(4032, 3024))).toEqual({ width: 4032, height: 3024 })
  })

  it('reads GIF dimensions (little-endian)', () => {
    expect(imageDimensions(gifHeader(640, 480))).toEqual({ width: 640, height: 480 })
  })

  it('reads lossy WebP (VP8) dimensions', () => {
    expect(imageDimensions(webpVp8Header(1920, 1080))).toEqual({ width: 1920, height: 1080 })
  })

  it('reads a real JPEG fixture', () => {
    const fixture = readFileSync(path.join(dirname, '../../e2e/fixtures/test-image.jpg'))
    const { width, height } = imageDimensions(fixture)
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
  })

  it('throws on data too short to hold a header', () => {
    expect(() => imageDimensions(new Uint8Array(4))).toThrow('too short')
  })

  it('throws on an unknown format', () => {
    const data = new Uint8Array(64).fill(0x42)
    expect(() => imageDimensions(data)).toThrow('Unsupported image format')
  })

  it('throws on a JPEG with no SOF marker', () => {
    const data = new Uint8Array(64)
    data.set([0xff, 0xd8, 0xff, 0xe0])
    new DataView(data.buffer).setUint16(4, 58)
    expect(() => imageDimensions(data)).toThrow('no SOF marker')
  })
})

export interface ImageDimensions {
  width: number
  height: number
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function ascii(data: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...data.subarray(offset, offset + length))
}

function pngDimensions(view: DataView): ImageDimensions {
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

function gifDimensions(view: DataView): ImageDimensions {
  return { width: view.getUint16(6, true), height: view.getUint16(8, true) }
}

/** Scan JPEG markers for the first SOFn frame header, which holds the dimensions. */
function jpegDimensions(data: Uint8Array, view: DataView): ImageDimensions {
  let offset = 2
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) throw new Error('Malformed JPEG: expected marker')
    const marker = data[offset + 1]
    if (marker === 0xff) {
      offset += 1
      continue
    }
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
    if (isSof) {
      return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) }
    }
    offset += 2 + view.getUint16(offset + 2)
  }
  throw new Error('Malformed JPEG: no SOF marker found')
}

function webpDimensions(data: Uint8Array, view: DataView): ImageDimensions {
  const chunk = ascii(data, 12, 4)
  if (chunk === 'VP8 ') {
    return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff }
  }
  if (chunk === 'VP8L') {
    const [b0, b1, b2, b3] = [data[21], data[22], data[23], data[24]]
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    }
  }
  if (chunk === 'VP8X') {
    const le24 = (o: number) => data[o] | (data[o + 1] << 8) | (data[o + 2] << 16)
    return { width: 1 + le24(24), height: 1 + le24(27) }
  }
  throw new Error(`Unsupported WebP variant: ${chunk}`)
}

/**
 * Read pixel dimensions from a PNG, JPEG, WebP, or GIF header.
 *
 * Intentionally minimal: guide images are repo-authored (trusted input), so
 * this replaces the `image-size` package without its many-format parsers.
 */
export function imageDimensions(data: Uint8Array): ImageDimensions {
  if (data.length < 30) throw new Error('Image data too short to contain a header')
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  if (PNG_SIGNATURE.every((byte, i) => data[i] === byte)) return pngDimensions(view)
  if (data[0] === 0xff && data[1] === 0xd8) return jpegDimensions(data, view)
  if (ascii(data, 0, 4) === 'RIFF' && ascii(data, 8, 4) === 'WEBP') {
    return webpDimensions(data, view)
  }
  if (ascii(data, 0, 4) === 'GIF8') return gifDimensions(view)
  throw new Error('Unsupported image format (expected PNG, JPEG, WebP, or GIF)')
}

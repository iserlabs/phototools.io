import { describe, it, expect, vi } from 'vitest'
import { extractFocalLength } from './extractFocalLength'

function makeFile(content = new Uint8Array([0xff, 0xd8]), name = 'photo.jpg') {
  return new File([content], name, { type: 'image/jpeg' })
}

vi.mock('exifreader', () => ({
  default: {
    load: vi.fn(),
  },
}))

async function getExifReader() {
  const mod = await import('exifreader')
  return mod.default
}

describe('extractFocalLength', () => {
  it('returns focalLength35 when FocalLengthIn35mmFilm is present', async () => {
    const ExifReader = await getExifReader()
    vi.mocked(ExifReader.load).mockResolvedValueOnce({
      FocalLengthIn35mmFilm: { value: 50, description: '50' },
      FocalLength: { value: 35, description: '35' },
    } as never)
    const result = await extractFocalLength(makeFile())
    expect(result).toEqual({ focalLength35: 50, focalLength: 35 })
  })

  it('returns only focalLength when FocalLengthIn35mmFilm is missing', async () => {
    const ExifReader = await getExifReader()
    vi.mocked(ExifReader.load).mockResolvedValueOnce({
      FocalLength: { value: 24, description: '24' },
    } as never)
    const result = await extractFocalLength(makeFile())
    expect(result).toEqual({ focalLength35: null, focalLength: 24 })
  })

  it('returns nulls when no focal length tags exist', async () => {
    const ExifReader = await getExifReader()
    vi.mocked(ExifReader.load).mockResolvedValueOnce({} as never)
    const result = await extractFocalLength(makeFile())
    expect(result).toEqual({ focalLength35: null, focalLength: null })
  })

  it('returns nulls on ExifReader error', async () => {
    const ExifReader = await getExifReader()
    vi.mocked(ExifReader.load).mockRejectedValueOnce(new Error('bad file'))
    const result = await extractFocalLength(makeFile())
    expect(result).toEqual({ focalLength35: null, focalLength: null })
  })

  it('clamps values to 8–800mm range', async () => {
    const ExifReader = await getExifReader()
    vi.mocked(ExifReader.load).mockResolvedValueOnce({
      FocalLengthIn35mmFilm: { value: 2000, description: '2000' },
      FocalLength: { value: 3, description: '3' },
    } as never)
    const result = await extractFocalLength(makeFile())
    expect(result).toEqual({ focalLength35: 800, focalLength: 8 })
  })
})

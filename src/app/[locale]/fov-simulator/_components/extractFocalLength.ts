export interface ExifFocalLength {
  focalLength35: number | null
  focalLength: number | null
}

const EMPTY: ExifFocalLength = { focalLength35: null, focalLength: null }

function clamp(v: number): number {
  return Math.max(8, Math.min(800, Math.round(v)))
}

function numericTag(tags: Record<string, unknown>, key: string): number | null {
  const tag = tags[key] as { value?: unknown; description?: string } | undefined
  if (!tag) return null
  const raw = typeof tag.description === 'string' ? tag.description
    : typeof tag.value === 'number' ? String(tag.value)
    : Array.isArray(tag.value) ? String(tag.value[0])
    : null
  if (!raw) return null
  const n = parseFloat(raw)
  return isNaN(n) || n <= 0 ? null : clamp(n)
}

export async function extractFocalLength(file: File): Promise<ExifFocalLength> {
  try {
    const ExifReader = (await import('exifreader')).default
    const buffer = await file.arrayBuffer()
    const tags = await ExifReader.load(buffer) as Record<string, unknown>
    return {
      focalLength35: numericTag(tags, 'FocalLengthIn35mmFilm'),
      focalLength: numericTag(tags, 'FocalLength'),
    }
  } catch {
    return EMPTY
  }
}

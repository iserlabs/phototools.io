const WORDS_PER_MINUTE = 200

/** Strips MDX/JSX tags and markdown syntax noise before counting. */
function toPlainText(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`>[\]()!-]/g, ' ')
}

export function getReadTimeMinutes(body: string, locale: string): number {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' })
  let words = 0
  for (const segment of segmenter.segment(toPlainText(body))) {
    if (segment.isWordLike) words += 1
  }
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

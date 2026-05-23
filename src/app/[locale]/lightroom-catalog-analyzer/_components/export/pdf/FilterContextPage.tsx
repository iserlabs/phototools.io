import { Text } from '@react-pdf/renderer'
import type { AnalysisFilter } from '@/lib/lrcat/types'
import { PageFrame } from './PageFrame'
import { pdfStyles } from './theme'
import type { PdfStrings } from './PdfDocument'

export function FilterContextPage({ filter, strings }: { filter: AnalysisFilter; strings: PdfStrings }) {
  const lines: string[] = []
  if (filter.dateRange) lines.push(`Date range: ${filter.dateRange.start} – ${filter.dateRange.end}`)
  if (filter.cameras?.length) lines.push(`Cameras: ${filter.cameras.join(', ')}`)
  if (filter.lenses?.length) lines.push(`Lenses: ${filter.lenses.join(', ')}`)
  if (filter.focalLengthRange) lines.push(`Focal length: ${filter.focalLengthRange[0]}–${filter.focalLengthRange[1]}mm`)
  if (filter.apertureRange) lines.push(`Aperture: f/${filter.apertureRange[0]}–f/${filter.apertureRange[1]}`)
  if (filter.isoRange) lines.push(`ISO: ${filter.isoRange[0]}–${filter.isoRange[1]}`)
  if (filter.ratings?.length) lines.push(`Ratings: ${filter.ratings.join(', ')}`)
  if (filter.keywords?.length) lines.push(`Keywords: ${filter.keywords.join(', ')}`)
  if (filter.picks) lines.push(`Pick state: ${filter.picks}`)
  return (
    <PageFrame generatedBy={strings.generatedBy} pageLabel={strings.page}>
      <Text style={pdfStyles.h2}>{strings.filterTitle}</Text>
      {lines.map((l) => <Text key={l} style={pdfStyles.body}>• {l}</Text>)}
    </PageFrame>
  )
}

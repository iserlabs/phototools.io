import { Image, Text } from '@react-pdf/renderer'
import { PageFrame } from '../PageFrame'
import { pdfStyles } from '../theme'
import type { SectionPageProps } from './types'

export function TimeOfDayPage({ blob, s, g, chart }: SectionPageProps) {
  const sa = blob.timeOfDay.bySunAngle
  const t = s.timeOfDay
  const pct = blob.meta.totalPhotos > 0 ? Math.round((sa.gpsPhotosCount / blob.meta.totalPhotos) * 100) : 0
  return (
    <PageFrame generatedBy={g.generatedBy} pageLabel={g.page}>
      <Text style={pdfStyles.h2}>{t.title}</Text>
      {chart && <Image style={pdfStyles.chart} src={chart} />}
      <Text style={pdfStyles.body}>Golden {sa.goldenHour.toLocaleString('en-US')} · Blue {sa.blueHour.toLocaleString('en-US')} · Midday {sa.midday.toLocaleString('en-US')} · Night {sa.night.toLocaleString('en-US')}</Text>
      <Text style={pdfStyles.muted}>{t.gpsNote.replace('{pct}', String(pct))}</Text>
    </PageFrame>
  )
}

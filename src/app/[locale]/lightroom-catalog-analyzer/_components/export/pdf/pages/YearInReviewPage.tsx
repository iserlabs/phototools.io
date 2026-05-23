import { Image, Text, View } from '@react-pdf/renderer'
import { PageFrame } from '../PageFrame'
import { pdfStyles } from '../theme'
import type { SectionPageProps } from './types'

export function YearInReviewPage({ blob, s, g, chart }: SectionPageProps) {
  const b = blob.yearInReview
  const t = s.yearInReview
  return (
    <PageFrame generatedBy={g.generatedBy} pageLabel={g.page}>
      <Text style={pdfStyles.h2}>{t.title}</Text>
      {b ? (
        <>
          <View style={pdfStyles.tileGrid}>
            <View style={pdfStyles.tileCell}><Text style={pdfStyles.tileLabel}>{t.tiles.totalPhotos}</Text><Text style={pdfStyles.tileValue}>{b.totalPhotos.toLocaleString('en-US')}</Text></View>
            <View style={pdfStyles.tileCell}><Text style={pdfStyles.tileLabel}>{t.tiles.daysShot}</Text><Text style={pdfStyles.tileValue}>{b.daysShot}</Text></View>
            <View style={pdfStyles.tileCell}><Text style={pdfStyles.tileLabel}>{t.tiles.topBody}</Text><Text style={pdfStyles.tileValue}>{b.topBody ?? '—'}</Text></View>
            <View style={pdfStyles.tileCell}><Text style={pdfStyles.tileLabel}>{t.tiles.topLens}</Text><Text style={pdfStyles.tileValue}>{b.topLens ?? '—'}</Text></View>
          </View>
          {chart && <Image style={pdfStyles.chart} src={chart} />}
          {b.mostProlificMonth && (
            <Text style={pdfStyles.body}>
              {t.callout.replace('{month}', b.mostProlificMonth.month).replace('{count}', b.mostProlificMonth.count.toLocaleString('en-US'))}
            </Text>
          )}
        </>
      ) : <Text style={pdfStyles.muted}>—</Text>}
    </PageFrame>
  )
}

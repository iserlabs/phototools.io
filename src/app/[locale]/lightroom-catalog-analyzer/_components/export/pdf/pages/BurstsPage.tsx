import { Image, Text, View } from '@react-pdf/renderer'
import { PageFrame } from '../PageFrame'
import { pdfStyles } from '../theme'
import type { SectionPageProps } from './types'

export function BurstsPage({ blob, s, g, chart }: SectionPageProps) {
  const b = blob.bursts
  const t = s.bursts
  const tiles = [
    { label: t.tiles.total, value: b.totalBursts.toLocaleString('en-US') },
    { label: t.tiles.inBursts, value: `${b.totalPhotosInBursts.toLocaleString('en-US')} (${b.pctInBursts.toFixed(0)}%)` },
    { label: t.tiles.longest, value: b.longestBurst.toLocaleString('en-US') },
  ]
  return (
    <PageFrame generatedBy={g.generatedBy} pageLabel={g.page}>
      <Text style={pdfStyles.h2}>{t.title}</Text>
      <View style={pdfStyles.tileGrid}>
        {tiles.map((tile) => (
          <View key={tile.label} style={pdfStyles.tileCell}>
            <Text style={pdfStyles.tileLabel}>{tile.label}</Text>
            <Text style={pdfStyles.tileValue}>{tile.value}</Text>
          </View>
        ))}
      </View>
      {chart && <Image style={pdfStyles.chart} src={chart} />}
      <Text style={pdfStyles.body}>
        {t.keeperRate.replace('{a}', b.keeperRatePct.toFixed(0)).replace('{b}', b.singleShotKeeperRatePct.toFixed(0))}
      </Text>
    </PageFrame>
  )
}

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/i18n/metadata'
import { SensorSizeV2 } from '../_components/v2/SensorSizeV2'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.sensor-size-comparison')
  const title = `${t('title')} (v2)`
  const description = t('description')
  return {
    title,
    description,
    openGraph: { title, description },
    alternates: getAlternates('/sensor-size-comparison/v2'),
    robots: { index: false },
  }
}

export default function SensorSizeV2Page() {
  return <SensorSizeV2 />
}

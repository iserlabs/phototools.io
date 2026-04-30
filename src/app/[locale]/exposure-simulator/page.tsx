import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { ExposureSimulator } from './_components/ExposureSimulator'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.exposure-simulator')
  return { title: t('title'), description: t('description'), alternates: getAlternates('/exposure-simulator', locale as Locale) }
}

export default function ExposureSimulatorPage() {
  return <ExposureSimulator />
}

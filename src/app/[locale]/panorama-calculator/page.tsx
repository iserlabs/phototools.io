import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { PanoramaCalculator } from './_components/PanoramaCalculator'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.panorama-calculator')
  return { title: t('title'), description: t('description'), alternates: getAlternates('/panorama-calculator', locale as Locale) }
}

export default function PanoramaCalculatorPage() {
  return <PanoramaCalculator />
}

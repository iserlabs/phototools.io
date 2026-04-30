import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { NdFilterCalculator } from './_components/NdFilterCalculator'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.nd-filter-calculator')
  return { title: t('title'), description: t('description'), alternates: getAlternates('/nd-filter-calculator', locale as Locale) }
}

export default function NdFilterCalculatorPage() {
  return <NdFilterCalculator />
}

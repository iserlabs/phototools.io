import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { DiffractionCalculator } from './_components/DiffractionCalculator'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.diffraction-calculator')
  return { title: t('title'), description: t('description'), alternates: getAlternates('/diffraction-calculator', locale as Locale) }
}

export default function DiffractionCalculatorPage() {
  return <DiffractionCalculator />
}

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { FocusStacking } from './_components/FocusStacking'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.focus-stacking-calculator')
  return { title: t('title'), description: t('description'), alternates: getAlternates('/focus-stacking-calculator', locale as Locale) }
}

export default function FocusStackingPage() {
  return <FocusStacking />
}

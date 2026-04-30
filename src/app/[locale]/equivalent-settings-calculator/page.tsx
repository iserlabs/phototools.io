import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { EquivalentSettings } from './_components/EquivalentSettings'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.equivalent-settings-calculator')
  return { title: t('title'), description: t('description'), alternates: getAlternates('/equivalent-settings-calculator', locale as Locale) }
}

export default function EquivalentSettingsPage() {
  return <EquivalentSettings />
}

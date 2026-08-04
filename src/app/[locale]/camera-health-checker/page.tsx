import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { CameraHealthChecker } from './_components/CameraHealthChecker'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.camera-health-checker')
  return { title: t('title'), description: t('description'), alternates: getAlternates('/camera-health-checker', locale as Locale) }
}

export default function CameraHealthCheckerPage() {
  return <CameraHealthChecker />
}

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { UnderConstruction } from '@/components/shared/UnderConstruction'
import { getToolBySlug, getToolStatus } from '@/lib/data/tools'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { DofSimulator } from './_components/DofSimulator'

// The simulator is mid-rebuild but its URL is already indexed and visited.
// While prod status is 'draft', serve a noindexed placeholder instead of the
// half-built app; dev ('live') still renders the real tool.
function isUnderConstruction(): boolean {
  const tool = getToolBySlug('dof-simulator')
  return tool ? getToolStatus(tool) === 'draft' : false
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.dof-simulator')
  const title = t('title')
  const description = t('description')
  return {
    title,
    description,
    openGraph: { title, description },
    alternates: getAlternates('/dof-simulator', locale as Locale),
    robots: isUnderConstruction() ? { index: false, follow: true } : undefined,
  }
}

export default function DofSimulatorPage() {
  if (isUnderConstruction()) return <UnderConstruction slug="dof-simulator" />
  return <DofSimulator />
}

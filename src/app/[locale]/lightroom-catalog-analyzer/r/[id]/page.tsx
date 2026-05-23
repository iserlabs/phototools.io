import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { fetchShare } from '@/lib/lrcat/fetch-share'
import { SharedDashboard } from '../../_components/viewer/SharedDashboard'

// Share IDs are unguessable, transient, and unbounded — never prerender them.
// `force-dynamic` keeps `next build` from attempting to statically generate
// arbitrary /r/[id] routes (and from caching the Blob fetch across recipients).
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'toolUI.lightroom-catalog-analyzer.share.recipient' })
  return {
    title: t('pageTitle'),
    // Transient user-generated surface — keep it out of every index.
    robots: { index: false, follow: false },
  }
}

export default async function SharedAnalysisPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'toolUI.lightroom-catalog-analyzer.share.recipient' })

  const result = await fetchShare(id)

  if (result.status === 'not-found') {
    return (
      <main style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
        <h1>{t('expiredTitle')}</h1>
        <p>{t('expiredBody')}</p>
      </main>
    )
  }

  if (result.status === 'schema-newer') {
    return (
      <main style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
        <h1>{t('schemaNewerTitle')}</h1>
        <p>{t('schemaNewerBody')}</p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <SharedDashboard blob={result.blob} />
    </main>
  )
}

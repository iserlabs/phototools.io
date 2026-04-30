import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.terms')
  return {
    title: t('title'),
    description: t('description'),
    alternates: getAlternates('/terms', locale as Locale),
  }
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('terms')
  const commonT = await getTranslations('common')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Terms of Service',
    url: 'https://www.phototools.io/terms',
  }

  const contactLink = (chunks: React.ReactNode) => (
    <Link href="/contact" style={{ color: 'var(--accent)' }}>
      {chunks}
    </Link>
  )

  return (
    <div
      style={{
        padding: 'var(--space-xl) var(--space-md)',
        maxWidth: 800,
        margin: '0 auto',
        overflowY: 'auto',
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {locale !== 'en' && (
        <aside
          role="note"
          style={{
            padding: 'var(--space-md)',
            marginBottom: 'var(--space-lg)',
            borderLeft: '3px solid var(--accent)',
            background: 'var(--bg-secondary)',
            fontSize: 14,
            color: 'var(--text-secondary)',
            borderRadius: 4,
          }}
        >
          {commonT('legalTranslationDisclaimer')}
        </aside>
      )}
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
        {t('title')}
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
        {t('effectiveDate')}
      </p>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
          {t('sections.acceptance.title')}
        </h2>
        <p>
          {t('sections.acceptance.body')}
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
          {t('sections.descriptionOfService.title')}
        </h2>
        <p>
          {t('sections.descriptionOfService.body')}
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
          {t('sections.noWarranty.title')}
        </h2>
        <p>
          {t('sections.noWarranty.body')}
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
          {t('sections.intellectualProperty.title')}
        </h2>
        <p>
          {t('sections.intellectualProperty.body')}
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
          {t('sections.acceptableUse.title')}
        </h2>
        <p>{t('sections.acceptableUse.intro')}</p>
        <ul style={{ marginTop: 'var(--space-sm)', paddingLeft: 'var(--space-lg)' }}>
          <li>{t('sections.acceptableUse.items.laws')}</li>
          <li>{t('sections.acceptableUse.items.disrupt')}</li>
          <li>{t('sections.acceptableUse.items.scrape')}</li>
          <li>{t('sections.acceptableUse.items.misrepresent')}</li>
          <li>{t('sections.acceptableUse.items.commercial')}</li>
        </ul>
      </section>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
          {t('sections.thirdPartyContent.title')}
        </h2>
        <p>
          {t('sections.thirdPartyContent.body')}
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
          {t('sections.limitationOfLiability.title')}
        </h2>
        <p>
          {t('sections.limitationOfLiability.body')}
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
          {t('sections.changesToTerms.title')}
        </h2>
        <p>
          {t('sections.changesToTerms.body')}
        </p>
      </section>

      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
          {t('sections.contact.title')}
        </h2>
        <p>
          {t.rich('sections.contact.body', { contactLink })}
        </p>
      </section>
    </div>
  )
}

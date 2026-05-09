import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import styles from '../privacy/legal-page.module.css'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.terms')
  return {
    title: t('title'),
    description: t('description'),
    alternates: getAlternates('/terms', locale as Locale),
  }
}

function TermsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  )
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('terms')
  const commonT = await getTranslations('common')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: t('title'),
    url: `https://www.phototools.io/${locale}/terms`,
    inLanguage: locale,
  }

  const contactLink = (chunks: React.ReactNode) => (
    <Link href="/contact" className={styles.link}>{chunks}</Link>
  )

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {locale !== 'en' && (
        <aside role="note" className={styles.disclaimer}>
          {commonT('legalTranslationDisclaimer')}
        </aside>
      )}
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.effectiveDate}>{t('effectiveDate')}</p>

      <TermsSection title={t('sections.acceptance.title')}>
        <p>{t('sections.acceptance.body')}</p>
      </TermsSection>

      <TermsSection title={t('sections.descriptionOfService.title')}>
        <p>{t('sections.descriptionOfService.body')}</p>
      </TermsSection>

      <TermsSection title={t('sections.noWarranty.title')}>
        <p>{t('sections.noWarranty.body')}</p>
      </TermsSection>

      <TermsSection title={t('sections.intellectualProperty.title')}>
        <p>{t('sections.intellectualProperty.body')}</p>
      </TermsSection>

      <TermsSection title={t('sections.acceptableUse.title')}>
        <p>{t('sections.acceptableUse.intro')}</p>
        <ul className={styles.list}>
          <li>{t('sections.acceptableUse.items.laws')}</li>
          <li>{t('sections.acceptableUse.items.disrupt')}</li>
          <li>{t('sections.acceptableUse.items.scrape')}</li>
          <li>{t('sections.acceptableUse.items.misrepresent')}</li>
          <li>{t('sections.acceptableUse.items.commercial')}</li>
        </ul>
      </TermsSection>

      <TermsSection title={t('sections.thirdPartyContent.title')}>
        <p>{t('sections.thirdPartyContent.body')}</p>
      </TermsSection>

      <TermsSection title={t('sections.limitationOfLiability.title')}>
        <p>{t('sections.limitationOfLiability.body')}</p>
      </TermsSection>

      <TermsSection title={t('sections.changesToTerms.title')}>
        <p>{t('sections.changesToTerms.body')}</p>
      </TermsSection>

      <TermsSection title={t('sections.contact.title')}>
        <p>{t.rich('sections.contact.body', { contactLink })}</p>
      </TermsSection>
    </div>
  )
}

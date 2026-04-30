import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { PrivacySection, SectionParagraph } from './PrivacySection'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.privacy')
  return {
    title: t('title'),
    description: t('description'),
    alternates: getAlternates('/privacy', locale as Locale),
  }
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('privacy')
  const commonT = await getTranslations('common')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Privacy Policy',
    url: 'https://www.phototools.io/privacy',
  }

  const contactLink = (chunks: React.ReactNode) => (
    <Link href="/contact" style={{ color: 'var(--accent)' }}>{chunks}</Link>
  )

  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>

  return (
    <div style={{ padding: 'var(--space-xl) var(--space-md)', maxWidth: 800, margin: '0 auto', overflowY: 'auto' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 'var(--space-sm)' }}>{t('title')}</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>{t('effectiveDate')}</p>

      <PrivacySection title={t('sections.overview.title')}>
        <p>{t('sections.overview.body')}</p>
      </PrivacySection>

      <PrivacySection title={t('sections.informationWeCollect.title')}>
        <p>{t('sections.informationWeCollect.intro')}</p>
        <SectionParagraph>{t.rich('sections.informationWeCollect.analytics', { strong })}</SectionParagraph>
        <SectionParagraph>{t.rich('sections.informationWeCollect.contactForm', { strong })}</SectionParagraph>
        <SectionParagraph>{t.rich('sections.informationWeCollect.noAccounts', { strong })}</SectionParagraph>
      </PrivacySection>

      <PrivacySection title={t('sections.cookies.title')}>
        <p>{t('sections.cookies.intro')}</p>
        <SectionParagraph>{t.rich('sections.cookies.analyticsCookies', { strong })}</SectionParagraph>
        <SectionParagraph>{t.rich('sections.cookies.adCookies', { strong })}</SectionParagraph>
        <SectionParagraph>{t('sections.cookies.control')}</SectionParagraph>
      </PrivacySection>

      <PrivacySection title={t('sections.thirdPartyAdvertising.title')}>
        <p>{t.rich('sections.thirdPartyAdvertising.body', {
          naiLink: (chunks) => (
            <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{chunks}</a>
          ),
        })}</p>
      </PrivacySection>

      <PrivacySection title={t('sections.googleAdSense.title')}>
        <p>{t('sections.googleAdSense.body1')}</p>
        <SectionParagraph>{t.rich('sections.googleAdSense.body2', {
          adsSettingsLink: (chunks) => (
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{chunks}</a>
          ),
          partnerSitesLink: (chunks) => (
            <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{chunks}</a>
          ),
        })}</SectionParagraph>
      </PrivacySection>

      <PrivacySection title={t('sections.cookieConsent.title')}>
        <p>{t('sections.cookieConsent.body1')}</p>
        <SectionParagraph>{t('sections.cookieConsent.body2')}</SectionParagraph>
      </PrivacySection>

      <PrivacySection title={t('sections.ccpa.title')}>
        <p>{t.rich('sections.ccpa.body', { contactLink })}</p>
      </PrivacySection>

      <PrivacySection title={t('sections.dataSharing.title')}>
        <p>{t('sections.dataSharing.intro')}</p>
        <SectionParagraph>{t.rich('sections.dataSharing.analytics', { strong })}</SectionParagraph>
        <SectionParagraph>{t.rich('sections.dataSharing.advertising', { strong })}</SectionParagraph>
        <SectionParagraph>{t('sections.dataSharing.contactForm')}</SectionParagraph>
      </PrivacySection>

      <PrivacySection title={t('sections.childrensPrivacy.title')}>
        <p>{t('sections.childrensPrivacy.body')}</p>
      </PrivacySection>

      <PrivacySection title={t('sections.yourRights.title')}>
        <p>{t('sections.yourRights.body1')}</p>
        <SectionParagraph>{t.rich('sections.yourRights.body2', { contactLink })}</SectionParagraph>
      </PrivacySection>

      <PrivacySection title={t('sections.changesToPolicy.title')}>
        <p>{t('sections.changesToPolicy.body')}</p>
      </PrivacySection>

      <PrivacySection title={t('sections.contact.title')}>
        <p>{t.rich('sections.contact.body', { contactLink })}</p>
      </PrivacySection>
    </div>
  )
}

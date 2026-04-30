import type { Metadata } from 'next'
import { ViewTransition } from 'react'
import Script from 'next/script'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { setRequestLocale, getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { AnalyticsProvider } from '@/lib/analytics/components/AnalyticsProvider'
import { Noto_Sans_JP, Noto_Sans_Bengali } from 'next/font/google'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { JsonLd } from '@/components/shared/JsonLd'
import { AdScripts } from '@/components/shared/AdScripts'
import { routing, localeOpenGraph } from '@/lib/i18n/routing'
import type { Locale } from '@/lib/i18n/routing'
import { getCookieyesId } from '@/lib/ads'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-ja',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ['bengali', 'latin'],
  variable: '--font-bn',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.site' })
  const description = t('description')
  const ogTitle = t('ogTitle')
  const ogLocale = localeOpenGraph[locale as Locale] || 'en_US'
  return {
    metadataBase: new URL('https://www.phototools.io'),
    title: { default: t('defaultTitle'), template: t('titleTemplate') },
    description,
    openGraph: {
      title: ogTitle,
      description,
      url: `https://www.phototools.io/${locale}`,
      siteName: 'PhotoTools',
      locale: ogLocale,
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => localeOpenGraph[l]),
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title: ogTitle, description },
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries([
        ...routing.locales.map((l) => [l, `/${l}`]),
        ['x-default', `/${routing.defaultLocale}`],
      ]),
    },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()

  const commonT = await getTranslations({ locale, namespace: 'common' })
  const siteT = await getTranslations({ locale, namespace: 'metadata.site' })
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PhotoTools',
    url: 'https://www.phototools.io',
    description: siteT('description'),
    inLanguage: locale,
  }
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'PhotoTools',
    url: 'https://www.phototools.io',
    logo: 'https://www.phototools.io/icon.svg',
    inLanguage: locale,
  }

  const cookieyesId = getCookieyesId()

  return (
    <>
      {cookieyesId && (
        <Script
          id="cookieyes"
          src={`https://cdn-cookieyes.com/client_data/${cookieyesId}/script.js`}
          strategy="beforeInteractive"
        />
      )}
      <a href="#main-content" className="skip-to-content">
        {commonT('skipToContent')}
      </a>
      <AdScripts />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <NextIntlClientProvider messages={messages}>
        <AnalyticsProvider>
          <JsonLd />
          <ThemeProvider>
            <ViewTransition>
              <div
                id="main-content"
                className={
                  locale === 'ja' ? notoSansJP.variable :
                  locale === 'bn' ? notoSansBengali.variable :
                  undefined
                }
              >
                {children}
              </div>
            </ViewTransition>
          </ThemeProvider>
        </AnalyticsProvider>
      </NextIntlClientProvider>
    </>
  )
}

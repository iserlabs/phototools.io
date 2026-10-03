// TEMPORARY — proof-loop canary B page (unlinked, noindex). Remove after the proof.
import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { GpuProbe } from './GpuProbe'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function AutofixCanaryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <GpuProbe />
}

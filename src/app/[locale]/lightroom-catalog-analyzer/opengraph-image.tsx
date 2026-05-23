import { generateOgImage } from '@/lib/og'

export const alt = 'Lightroom Catalog Analyzer — PhotoTools'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const TAGLINE = 'Free · runs entirely in your browser · no upload'

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  let name: string | undefined
  try {
    const messages = (await import(`@/lib/i18n/messages/${locale}/tools.json`)).default
    name = messages?.tools?.['lightroom-catalog-analyzer']?.name
  } catch { /* fallback to registry name in og.tsx */ }
  return generateOgImage('lightroom-catalog-analyzer', { name, description: TAGLINE })
}

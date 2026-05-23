import { ImageResponse } from 'next/og'
import { OgBackground, OgBranding, OgAccentLine } from '@/lib/og-layout'
import { fetchShare } from '@/lib/lrcat/fetch-share'
import { buildOgStats } from './og-stats'

export const runtime = 'nodejs'
export const alt = 'Lightroom Catalog Analysis'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <OgBackground>
      <div style={{ position: 'absolute', left: 80, top: 64, right: 80, display: 'flex', flexDirection: 'column' }}>
        <OgBranding />
        {children}
      </div>
      <OgAccentLine />
    </OgBackground>
  )
}

function Header({ filtered }: { filtered: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 36, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 52, fontWeight: 800, color: '#e5e5e5', lineHeight: 1.1 }}>
        Lightroom Catalog Analysis
      </span>
      {filtered && (
        <span style={{ fontSize: 26, color: '#f59e0b' }}>(Filtered view)</span>
      )}
    </div>
  )
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let stats: ReturnType<typeof buildOgStats> | null = null
  try {
    const result = await fetchShare(id)
    if (result.status === 'found') stats = buildOgStats(result.blob)
  } catch {
    stats = null
  }

  // Static fallback when the blob is unreachable / expired / newer-schema.
  if (!stats) {
    return new ImageResponse(
      (
        <Frame>
          <Header filtered={false} />
          <div style={{ fontSize: 28, color: '#888888' }}>
            Gear, focal length, apertures, ratings, and more — analyzed 100% in your browser.
          </div>
        </Frame>
      ),
      { width: 1200, height: 630 },
    )
  }

  return new ImageResponse(
    (
      <Frame>
        <Header filtered={stats.filtered} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {stats.cells.map((cell) => (
            <div
              key={cell.label}
              style={{ display: 'flex', flexDirection: 'column', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.18)', borderRadius: 14, padding: '16px 22px', minWidth: 200 }}
            >
              <span style={{ fontSize: 16, color: '#888888', textTransform: 'uppercase', letterSpacing: 1 }}>{cell.label}</span>
              <span style={{ fontSize: 34, fontWeight: 700, color: '#e5e5e5' }}>{cell.value}</span>
            </div>
          ))}
        </div>
      </Frame>
    ),
    { width: 1200, height: 630 },
  )
}

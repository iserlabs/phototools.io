import { ImageResponse } from 'next/og'
import { getToolBySlug } from '@/lib/data/tools'
import { OgBackground, OgDiamonds, OgBranding, OgAccentLine } from './og-layout'

const TOOL_EMOJIS: Record<string, string> = {
  'fov-simulator': '🔭',
  'color-scheme-generator': '🎨',
  'exposure-simulator': '📸',
  'dof-simulator': '🌿',
  'hyperfocal-simulator': '🎯',
  'shutter-speed-visualizer': '⏱️',
  'nd-filter-calculator': '🕶️',
  'star-trail-calculator': '⭐',
  'white-balance-visualizer': '🌡️',
  'sensor-size-comparison': '📏',
  'exif-viewer': '🗂️',
  'perspective-compression-simulator': '🏔️',
  'megapixels-size-visualizer': '🖼️',
  'lightroom-catalog-analyzer': '📊',
}

const CATEGORY_LABELS: Record<string, string> = {
  visualizer: 'Visualizer',
  calculator: 'Calculator',
  'file-tool': 'File Tool',
}

export async function generateOgImage(slug: string, overrides?: { name?: string, description?: string }) {
  const tool = getToolBySlug(slug)
  if (!tool) return new Response('Not Found', { status: 404 })

  const emoji = TOOL_EMOJIS[slug] ?? '📷'
  const categoryLabel = CATEGORY_LABELS[tool.category] ?? tool.category
  const displayName = overrides?.name ?? tool.name
  const displayDescription = overrides?.description ?? tool.description

  return new ImageResponse(
    (
      <OgBackground>
        <OgDiamonds emoji={emoji} />
        <div
          style={{
            position: 'absolute',
            left: 80,
            top: '50%',
            transform: 'translateY(-50%)',
            maxWidth: '52%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <OgBranding />
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: '#e5e5e5',
              lineHeight: 1.15,
              marginBottom: 24,
            }}
          >
            {displayName}
          </div>
          <div style={{ fontSize: 24, color: '#888888', lineHeight: 1.5 }}>
            {displayDescription}
          </div>
          <div style={{ display: 'flex', marginTop: 28 }}>
            <span
              style={{
                color: '#f59e0b',
                fontSize: 16,
                textTransform: 'uppercase' as const,
                letterSpacing: 3,
                border: '1.5px solid rgba(245, 158, 11, 0.25)',
                padding: '6px 20px',
                borderRadius: 100,
              }}
            >
              {categoryLabel}
            </span>
          </div>
        </div>
        <OgAccentLine />
      </OgBackground>
    ),
    { width: 1200, height: 630 },
  )
}

export async function generateHomepageOgImage(opts: { title: string; description: string }) {
  const { title, description } = opts
  return new ImageResponse(
    (
      <OgBackground>
        <OgDiamonds emoji="📷" />
        <div
          style={{
            position: 'absolute',
            left: 80,
            top: '50%',
            transform: 'translateY(-50%)',
            maxWidth: '55%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <OgBranding />
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: '#e5e5e5',
              lineHeight: 1.15,
              marginBottom: 24,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 28, color: '#888888', lineHeight: 1.5 }}>
            {description}
          </div>
        </div>
        <OgAccentLine />
      </OgBackground>
    ),
    { width: 1200, height: 630 },
  )
}

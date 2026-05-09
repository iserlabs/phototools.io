'use client'

import { useTranslations } from 'next-intl'
import { formatDist } from '@/components/shared/dof-diagram-helpers'

interface HyperfocalBadgeProps {
  isAtHyperfocal: boolean
  nearLimit: number
}

export function HyperfocalBadge({ isAtHyperfocal, nearLimit }: HyperfocalBadgeProps) {
  const t = useTranslations('toolUI.hyperfocal-simulator')
  if (!isAtHyperfocal) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        background: 'rgba(99, 102, 241, 0.9)',
        color: '#fff',
        padding: '8px 14px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.5,
        backdropFilter: 'blur(8px)',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: 14 }}>∞ {t('sharpToInfinity')}</div>
      <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>
        {t('nearLimitBadge')} {formatDist(nearLimit)}
      </div>
    </div>
  )
}

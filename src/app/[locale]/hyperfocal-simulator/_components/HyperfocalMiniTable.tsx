'use client'

import { useTranslations } from 'next-intl'
import { calcHyperfocal } from '@/lib/math/dof'
import { APERTURES } from '@/lib/data/camera'
import { formatDist } from '@/components/shared/dof-diagram-helpers'

interface HyperfocalMiniTableProps {
  focalLength: number
  aperture: number
  coc: number
}

export function HyperfocalMiniTable({ focalLength, aperture, coc }: HyperfocalMiniTableProps) {
  const t = useTranslations('toolUI.hyperfocal-simulator')
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 8 }}>
        {t('hyperfocalReference')} — {focalLength}mm
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <tbody>
          {APERTURES.map((ap) => {
            const hf = calcHyperfocal(focalLength, ap, coc)
            const isCurrent = ap === aperture
            return (
              <tr key={ap} style={{ background: isCurrent ? 'var(--bg-primary)' : undefined }}>
                <td style={{ padding: '4px 8px', color: isCurrent ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: isCurrent ? 600 : 400 }}>
                  f/{ap}
                </td>
                <td style={{ padding: '4px 8px', fontFamily: 'var(--font-mono)', textAlign: 'right', color: isCurrent ? 'var(--accent)' : 'var(--text-primary)', fontWeight: isCurrent ? 600 : 400 }}>
                  {formatDist(hf)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

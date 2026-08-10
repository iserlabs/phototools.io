'use client'

import { useTranslations } from 'next-intl'
import { getSkeletonBySlug } from '@/lib/data/education'
import type { Tooltip } from '@/lib/data/education/types'

export type DofTooltipKey =
  | 'focalLength'
  | 'aperture'
  | 'subjectDistance'
  | 'sensor'
  | 'hyperfocal'
  | 'coc'
  | 'backgroundBlur'
  | 'diffractionWarning'

export type DofTooltips = Partial<Record<DofTooltipKey, Tooltip>>

/**
 * Builds the `{ term, definition }` tooltip data for every key in the
 * dof-simulator education skeleton's `tooltipKeys` (content-dof.ts), keyed
 * by that same code identifier — shared by every *Connected panel that wires
 * an `InfoTooltip` next to a control (LensPanel/DistancePanel/CameraPanel/
 * ResultsPanel), so the education.dof-simulator.tooltips.* strings have a
 * single call site rather than four copies of the same Object.fromEntries
 * (dof-simulator-rebuild final fix wave, B10).
 */
export function useDofTooltips(): DofTooltips {
  const et = useTranslations('education.dof-simulator')
  const skel = getSkeletonBySlug('dof-simulator')
  if (!skel) return {}
  return Object.fromEntries(
    skel.tooltipKeys.map((key) => [
      key,
      { term: et(`tooltips.${key}.term`), definition: et(`tooltips.${key}.definition`) },
    ])
  ) as DofTooltips
}

import type { DofBackground } from './types'

interface BackgroundRow {
  id: string
  name: string
  distanceM: number
  highlightRich: boolean
}

// distanceM is the subject-to-background distance used by the framing/DOF
// math; highlightRich scenes carry many small bright points (city lights,
// string lights, lanterns) that make good bokeh showcases at wide apertures.
const ROWS: BackgroundRow[] = [
  { id: 'city-skyline', name: 'City Skyline', distanceM: 300, highlightRich: true },
  { id: 'old-town-street', name: 'Old Town Street', distanceM: 25, highlightRich: true },
  { id: 'mountains', name: 'Mountains', distanceM: 2000, highlightRich: false },
  { id: 'park', name: 'Park', distanceM: 40, highlightRich: false },
  { id: 'autumn-tree', name: 'Autumn Tree', distanceM: 15, highlightRich: false },
  { id: 'cathedral', name: 'Cathedral', distanceM: 60, highlightRich: false },
  { id: 'modern-building', name: 'Modern Building', distanceM: 80, highlightRich: false },
  { id: 'night-lights', name: 'Night Lights', distanceM: 50, highlightRich: true },
]

export const DOF_BACKGROUNDS: DofBackground[] = ROWS.map((r) => ({
  id: r.id,
  name: r.name,
  distanceM: r.distanceM,
  srcLandscape: `/dof/backgrounds/${r.id}-landscape.webp`,
  srcPortrait: `/dof/backgrounds/${r.id}-portrait.webp`,
  highlightRich: r.highlightRich,
}))

export function getBackgroundById(id: string): DofBackground {
  return DOF_BACKGROUNDS.find((b) => b.id === id) ?? DOF_BACKGROUNDS[0]
}

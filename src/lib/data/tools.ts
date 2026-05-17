import type { ToolDef, ToolStatus } from '@/lib/types'

// i18n: name and description are duplicated in messages/en/tools.json (which
// is what user-facing UI reads via useTranslations). These inline English
// strings remain as fallbacks for OG image generation in src/lib/og.tsx and
// other server contexts where the locale-aware translations are not loaded.
export const TOOLS: ToolDef[] = [
  { slug: 'fov-simulator', name: 'Field-of-View Simulator', description: 'Compare field of view across focal lengths and sensor sizes', dev: 'live', prod: 'live', category: 'visualizer' },
  { slug: 'color-scheme-generator', name: 'Color Scheme Generator', description: 'Build color palettes for photography shoots', dev: 'live', prod: 'live', category: 'visualizer' },
  { slug: 'exposure-simulator', name: 'Exposure Triangle Simulator', description: 'See how aperture, shutter speed, and ISO interact', dev: 'live', prod: 'live', category: 'visualizer' },
  { slug: 'dof-simulator', name: 'Depth-of-Field Simulator', description: 'Visualize how aperture, focal length, and distance affect background blur', dev: 'live', prod: 'live', category: 'visualizer' },
  { slug: 'focus-stacking-calculator', name: 'Focus Stacking Calculator', description: 'Calculate optimal focus distances for front-to-back sharpness', dev: 'live', prod: 'disabled', category: 'calculator' },
  { slug: 'equivalent-settings-calculator', name: 'Equivalent Settings Calculator', description: 'Find equivalent aperture and focal length across sensor formats', dev: 'live', prod: 'live', category: 'calculator' },
  { slug: 'hyperfocal-simulator', name: 'Hyperfocal Distance Simulator', description: 'Learn where to focus for maximum sharpness from foreground to infinity', dev: 'live', prod: 'live', category: 'visualizer' },
  { slug: 'shutter-speed-visualizer', name: 'Shutter Speed Visualizer', description: 'Find the minimum safe shutter speed for sharp handheld shots', dev: 'live', prod: 'disabled', category: 'visualizer' },
  { slug: 'nd-filter-calculator', name: 'ND Filter Calculator', description: 'Calculate exposure time with any ND filter', dev: 'live', prod: 'live', category: 'calculator' },
  { slug: 'star-trail-calculator', name: 'Star Trail Calculator', description: 'Calculate max exposure for sharp stars or plan star trail shots', dev: 'live', prod: 'live', category: 'visualizer' },
  { slug: 'perspective-compression-simulator', name: 'Perspective Compression Simulator', description: 'See how focal length affects background compression', dev: 'live', prod: 'disabled', category: 'visualizer' },
  { slug: 'white-balance-visualizer', name: 'White Balance Visualizer', description: 'See how color temperature affects your photos', dev: 'live', prod: 'live', category: 'visualizer' },
  { slug: 'sensor-size-comparison', name: 'Sensor Size Comparison', description: 'Compare camera sensor sizes visually', dev: 'live', prod: 'live', category: 'visualizer' },
  { slug: 'frame-studio', name: 'Frame Studio', description: 'Crop, frame, and compose photos with grid overlays', dev: 'live', prod: 'live', category: 'file-tool' },
  { slug: 'exif-viewer', name: 'EXIF Viewer', description: 'View EXIF metadata and histogram for any photo — 100% client-side', dev: 'live', prod: 'live', category: 'file-tool' },
  { slug: 'megapixels-size-visualizer', name: 'Megapixels Size Visualizer', description: 'Compare megapixels, visualize print sizes, and see file sizes across aspect ratios and DPIs', dev: 'live', prod: 'live', category: 'visualizer' },
]

function getStatus(tool: ToolDef): ToolStatus {
  return process.env.NODE_ENV === 'development' ? tool.dev : tool.prod
}

export function getToolBySlug(slug: string): ToolDef | undefined {
  return TOOLS.find((t) => t.slug === slug)
}

export function getToolStatus(tool: ToolDef): ToolStatus {
  return getStatus(tool)
}

export function getLiveTools(): ToolDef[] {
  return TOOLS.filter((t) => getStatus(t) === 'live')
}

/** All tools except disabled ones — includes live + draft (coming soon) */
export function getVisibleTools(): ToolDef[] {
  return TOOLS.filter((t) => getStatus(t) !== 'disabled')
}

/** Every tool regardless of status */
export function getAllTools(): ToolDef[] {
  return TOOLS
}

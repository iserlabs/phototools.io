import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const s = 20 // default size

/** FOV Simulator — viewfinder / angle of view */
function FovSimulator(p: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M2 12l7-8v5h6V4l7 8-7 8v-5H9v5z" />
    </svg>
  )
}

/** Color Harmony Picker — palette / color wheel */
function ColorHarmony(p: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="7" r="2.5" />
      <circle cx="7.5" cy="15" r="2.5" />
      <circle cx="16.5" cy="15" r="2.5" />
    </svg>
  )
}

/** Exposure Triangle Simulator — aperture blades */
function ExposureSimulator(p: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polygon points="12,2 22,18 2,18" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}

/** Depth of Field Calculator — focus layers */
function DofCalculator(p: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="7" strokeDasharray="3 2" />
      <circle cx="12" cy="12" r="10" strokeDasharray="2 3" opacity={0.4} />
    </svg>
  )
}

/** Hyperfocal Distance Simulator — infinity focus */
function HyperfocalSimulator(p: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M2 12h20" />
      <path d="M12 6v12" />
      <path d="M7 8c0 0 2.5 4 5 4s5-4 5-4" />
      <path d="M7 16c0 0 2.5-4 5-4s5 4 5 4" />
    </svg>
  )
}

/** Shutter Speed Guide — clock / timer */
function ShutterSpeedGuide(p: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="13" r="9" />
      <path d="M12 9v4l3 2" />
      <path d="M10 2h4" />
    </svg>
  )
}

/** ND Filter Calculator — dark filter disc */
function NdFilterCalculator(p: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="5" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
    </svg>
  )
}

/** Star Trail Calculator — star with trail arc */
function StarTrailCalculator(p: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 2l2.1 6.5H21l-5.5 4 2.1 6.5L12 15l-5.6 4 2.1-6.5L3 8.5h6.9z" />
    </svg>
  )
}

/** White Balance Visualizer — sun/warm-cool */
function WhiteBalance(p: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M4.22 4.22l2.12 2.12" />
      <path d="M17.66 17.66l2.12 2.12" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="M4.22 19.78l2.12-2.12" />
      <path d="M17.66 6.34l2.12-2.12" />
    </svg>
  )
}

/** Sensor Size Comparison — nested rectangles */
function SensorSize(p: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <rect x="5" y="7" width="14" height="10" rx="1" strokeDasharray="3 2" />
      <rect x="8" y="9" width="8" height="6" rx="1" strokeDasharray="2 2" opacity={0.5} />
    </svg>
  )
}

/** EXIF Viewer — file info */
function ExifViewer(p: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  )
}

/** Perspective Compression Simulator — compress/telephoto */
function PerspectiveCompression(p: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 3v18" />
      <path d="M16 3v18" />
      <path d="M3 8h4" />
      <path d="M3 16h4" />
      <path d="M17 8h4" />
      <path d="M17 16h4" />
      <path d="M5 12h2" />
      <path d="M17 12h2" />
    </svg>
  )
}

/** Frame Studio — crop/frame icon */
function FrameStudioIcon(p: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="6" y="6" width="12" height="12" rx="1" strokeDasharray="3 2" />
      <path d="M9 3v3" />
      <path d="M15 3v3" />
      <path d="M9 18v3" />
      <path d="M15 18v3" />
      <path d="M3 9h3" />
      <path d="M18 9h3" />
      <path d="M3 15h3" />
      <path d="M18 15h3" />
    </svg>
  )
}

/** Focus Stacking Calculator — stacked layers */
function FocusStackingCalc(p: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="4" y="14" width="16" height="4" rx="1" />
      <rect x="5" y="9" width="14" height="4" rx="1" opacity={0.7} />
      <rect x="6" y="4" width="12" height="4" rx="1" opacity={0.4} />
    </svg>
  )
}

/** Equivalent Settings Calculator — balance/scale */
function EquivalentSettingsCalc(p: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3v18" />
      <path d="M4 7l8-4 8 4" />
      <path d="M2 12c1 2 3 2 4 0" />
      <path d="M18 12c1 2 3 2 4 0" />
    </svg>
  )
}

/** Megapixels Size Visualizer — pixel grid with one highlighted cell */
function MegapixelVisualizerIcon(p: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={s} height={s}
         fill="none" stroke="currentColor" strokeWidth={1.5}
         strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="2" width="20" height="20" rx="1" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="7" x2="22" y2="7" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="17" x2="22" y2="17" />
      <rect x="7" y="7" width="5" height="5" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Lightroom Catalog Analyzer — bar chart inspected by a magnifying glass */
function LightroomCatalogAnalyzerIcon(p: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={s} height={s}
         fill="none" stroke="currentColor" strokeWidth={1.5}
         strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 21h18" />
      <path d="M5 21v-6" />
      <path d="M9.5 21v-9" />
      <path d="M14 21v-4" />
      <circle cx="16.5" cy="8.5" r="4" />
      <path d="M19.5 11.5L22 14" />
    </svg>
  )
}

const ICON_MAP: Record<string, (props: IconProps) => React.JSX.Element> = {
  'fov-simulator': FovSimulator,
  'color-scheme-generator': ColorHarmony,
  'exposure-simulator': ExposureSimulator,
  'dof-simulator': DofCalculator,
  'focus-stacking-calculator': FocusStackingCalc,
  'equivalent-settings-calculator': EquivalentSettingsCalc,
  'hyperfocal-simulator': HyperfocalSimulator,
  'shutter-speed-visualizer': ShutterSpeedGuide,
  'nd-filter-calculator': NdFilterCalculator,

  'star-trail-calculator': StarTrailCalculator,
  'white-balance-visualizer': WhiteBalance,
  'sensor-size-comparison': SensorSize,
  'exif-viewer': ExifViewer,
  'perspective-compression-simulator': PerspectiveCompression,
  'frame-studio': FrameStudioIcon,
  'megapixels-size-visualizer': MegapixelVisualizerIcon,
  'lightroom-catalog-analyzer': LightroomCatalogAnalyzerIcon,
}

interface ToolIconProps extends IconProps {
  slug: string
}

export function ToolIcon({ slug, ...props }: ToolIconProps) {
  const Icon = ICON_MAP[slug]
  if (!Icon) return null
  return <Icon {...props} />
}

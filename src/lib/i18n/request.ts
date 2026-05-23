import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'

const CORE_FILES = ['common', 'home', 'tools', 'glossary', 'about', 'contact', 'privacy', 'terms', 'metadata'] as const

/** Tools that have BOTH education and toolUI message files. */
const TOOL_SLUGS = [
  'dof-simulator', 'fov-simulator', 'exposure-simulator', 'frame-studio',
  'star-trail-calculator', 'white-balance-visualizer', 'hyperfocal-simulator',
  'shutter-speed-visualizer', 'sensor-size-comparison', 'color-scheme-generator',
  'perspective-compression-simulator', 'exif-viewer', 'nd-filter-calculator',
  'histogram', 'focus-stacking-calculator', 'equivalent-settings-calculator',
  'megapixels-size-visualizer',
] as const

/** Tools that have toolUI messages only (no LearnPanel / education). */
const TOOL_UI_ONLY_SLUGS = [
  'lightroom-catalog-analyzer',
] as const

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  const [coreModules, eduModules, toolModules, toolUiOnlyModules] = await Promise.all([
    Promise.all(CORE_FILES.map(f => import(`./messages/${locale}/${f}.json`))),
    Promise.all(TOOL_SLUGS.map(s => import(`./messages/${locale}/education/${s}.json`))),
    Promise.all(TOOL_SLUGS.map(s => import(`./messages/${locale}/tools/${s}.json`))),
    Promise.all(TOOL_UI_ONLY_SLUGS.map(s => import(`./messages/${locale}/tools/${s}.json`))),
  ])

  const coreMessages = Object.assign({}, ...coreModules.map(m => m.default))

  const educationMessages = eduModules.reduce((acc, mod) => {
    if (mod.default.education) {
      acc.education = { ...acc.education, ...mod.default.education }
    }
    return acc
  }, { education: {} } as { education: Record<string, unknown> })

  const toolUIMessages = [...toolModules, ...toolUiOnlyModules].reduce((acc, mod) => {
    if (mod.default.toolUI) {
      acc.toolUI = { ...acc.toolUI, ...mod.default.toolUI }
    }
    return acc
  }, { toolUI: {} } as { toolUI: Record<string, unknown> })

  return {
    locale,
    messages: {
      ...coreMessages,
      ...educationMessages,
      ...toolUIMessages,
    },
  }
})

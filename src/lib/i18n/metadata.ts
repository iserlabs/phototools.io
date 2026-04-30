import { routing, type Locale } from './routing'

/**
 * Generate alternates for a tool/info page. Includes:
 * - canonical: per-locale canonical URL (Next.js replaces the parent's
 *   `alternates` wholesale, so without this each tool page would inherit no
 *   canonical)
 * - languages: hreflang map for each locale + x-default
 *
 * Example: getAlternates('/fov-simulator', 'en') →
 *   { canonical: '/en/fov-simulator', languages: { en: '/en/fov-simulator', ... } }
 *
 * The `locale` argument is optional for backward compatibility; when omitted,
 * only the languages map is returned.
 */
export function getAlternates(path: string, locale?: Locale) {
  const languages = Object.fromEntries([
    ...routing.locales.map((l) => [l, `/${l}${path}`]),
    ['x-default', `/${routing.defaultLocale}${path}`],
  ])
  if (locale) {
    return { canonical: `/${locale}${path}`, languages }
  }
  return { languages }
}

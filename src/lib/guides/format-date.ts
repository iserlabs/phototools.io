import type { Locale } from '@/lib/i18n/routing'

/**
 * Format a guide's `YYYY-MM-DD` frontmatter date for display.
 *
 * Formatting in UTC is load-bearing, not incidental: `new Date('2026-08-07')`
 * resolves to UTC midnight, so rendering it in the server's or reader's local
 * zone shows the previous day anywhere west of Greenwich. These are calendar
 * dates with no time component, so UTC is the only reading that round-trips.
 */
export function formatGuideDate(isoDate: string, locale: Locale | string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(isoDate)
  )
}

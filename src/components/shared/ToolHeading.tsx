'use client'

import { useTranslations } from 'next-intl'

interface ToolHeadingProps {
  /** Tool slug from src/lib/data/tools.ts. The H1 text comes from
   *  `tools.{slug}.name` in the active locale. */
  slug: string
}

/**
 * Visually hidden H1 for tool pages. Each tool needs exactly one H1 for SEO
 * (so search engines and accessibility trees know the page topic) but most
 * tool layouts already display the name in a header band or omit it for space.
 * Rendering an `sr-only` H1 keeps the layout untouched while satisfying the
 * single-H1 requirement.
 */
export function ToolHeading({ slug }: ToolHeadingProps) {
  const t = useTranslations('tools')
  return <h1 className="sr-only">{t(`${slug}.name`)}</h1>
}

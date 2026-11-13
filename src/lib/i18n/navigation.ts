import { createElement, type ComponentProps } from 'react'
import { createNavigation } from 'next-intl/navigation'
import { PAGE_NAV_TRANSITION } from '@/lib/viewTransitions'
import { routing } from './routing'

const navigation = createNavigation(routing)

export const { redirect, usePathname, useRouter, getPathname } = navigation

type LinkProps = ComponentProps<typeof navigation.Link>

/**
 * Locale-aware `Link` that tags its navigation with the page-nav Transition
 * Type, so the layout's `<ViewTransition>` animates it (see viewTransitions.ts).
 * Pass `transitionTypes` explicitly to override.
 */
export function Link({ transitionTypes = [PAGE_NAV_TRANSITION], ...props }: LinkProps) {
  return createElement(navigation.Link, { ...props, transitionTypes })
}

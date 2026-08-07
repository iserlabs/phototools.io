import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Link } from '@/lib/i18n/navigation'

export function MdxA({ href = '', children }: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) {
  if (href.startsWith('/')) {
    return (
      <Link href={href} prefetch={false}>
        {children}
      </Link>
    )
  }
  if (href.startsWith('#')) {
    return <a href={href}>{children}</a>
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

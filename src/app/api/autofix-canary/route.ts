// TEMPORARY — sandbox-hardening canary (see src/lib/autofix-canary/slug.ts). Remove after the proof.
import { slug } from '@/lib/autofix-canary/slug'

export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  const title = new URL(request.url).searchParams.get('title') as string
  return Response.json({ slug: slug(title) })
}

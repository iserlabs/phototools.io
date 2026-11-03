// TEMPORARY — sandbox-hardening canary (see src/lib/autofix-canary/slug.ts). Remove after the proof.
import { slug } from '@/lib/autofix-canary/slug'

export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  // searchParams.get() returns string | null: `?title=` may be absent entirely,
  // so the param has to be validated before it reaches slug(), which expects a string.
  const title = new URL(request.url).searchParams.get('title')
  if (title === null || title.trim() === '') {
    return Response.json({ error: 'missing-title' }, { status: 400 })
  }
  return Response.json({ slug: slug(title) })
}

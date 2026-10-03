// TEMPORARY — proof-loop canary A (see src/lib/autofix-canary/initials.ts). Remove after the proof.
import { initials } from '@/lib/autofix-canary/initials'

export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  const name = new URL(request.url).searchParams.get('name')
  return Response.json({ initials: initials(name) })
}

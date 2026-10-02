// TEMPORARY — Stage 1 canary for the hub's Sentry auto-fix loop. Remove after the proof.
export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  // `get()` returns null when the query parameter is absent — fall back to a greeting
  // that works for a bare GET (which is how uptime probes hit this route).
  const name = new URL(request.url).searchParams.get('name')?.trim() || 'world'
  return Response.json({ greeting: `hello ${name.toUpperCase()}` })
}

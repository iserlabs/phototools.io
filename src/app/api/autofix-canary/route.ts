// TEMPORARY — Stage 1 canary for the hub's Sentry auto-fix loop. Remove after the proof.
// Deliberate bug: `name` is null when the query parameter is absent; the cast hides it from tsc.
export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  const name = new URL(request.url).searchParams.get('name') as string
  return Response.json({ greeting: `hello ${name.toUpperCase()}` })
}

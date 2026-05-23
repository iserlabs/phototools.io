import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { listSharePathnames, deleteShareBlob } from '@/lib/lrcat/share-blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Allow a generous window for a large backlog sweep.
export const maxDuration = 60

const ALERT_THRESHOLD = 1000

/** Parse the ISO timestamp embedded in `share/{ISO}/{id}.json`. */
function expiryFromPathname(pathname: string): number | null {
  const m = pathname.match(/^share\/([^/]+)\/[A-Za-z0-9_-]{16}\.json$/)
  if (!m) return null
  const ms = new Date(m[1]).getTime()
  return Number.isFinite(ms) ? ms : null
}

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    logger.warn('share', 'Unauthorized cron call')
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  let deleted = 0
  let failures = 0

  try {
    const pathnames = await listSharePathnames()
    for (const pathname of pathnames) {
      const expiry = expiryFromPathname(pathname)
      if (expiry === null || expiry >= now) continue
      try {
        await deleteShareBlob(pathname)
        deleted++
      } catch (err) {
        failures++
        logger.error('share', 'Cron delete failed', { pathname, error: err instanceof Error ? err : String(err) })
      }
    }
  } catch (err) {
    logger.error('share', 'Cron list failed', { error: err instanceof Error ? err : String(err) })
    return NextResponse.json({ error: 'list-failed' }, { status: 500 })
  }

  if (deleted > ALERT_THRESHOLD || failures > 0) {
    logger.error('share', 'Cron run anomaly', { deleted, failures })
  } else {
    logger.info('share', 'Cron sweep complete', { deleted })
  }

  return NextResponse.json({ deleted, failures }, { status: 200 })
}

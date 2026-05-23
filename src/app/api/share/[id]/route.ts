import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { resolveShareBlob, deleteShareBlob } from '@/lib/lrcat/share-blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ID_RE = /^[A-Za-z0-9_-]{16}$/

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, ctx: RouteCtx): Promise<Response> {
  const { id } = await ctx.params
  if (!ID_RE.test(id)) return NextResponse.json({ error: 'bad-id' }, { status: 400 })

  const found = await resolveShareBlob(id)
  if (!found) {
    logger.info('share', 'GET miss', { id })
    return NextResponse.json({ error: 'not-found' }, { status: 404 })
  }

  // Defensive: even if the cron hasn't swept it yet, never serve an expired blob.
  if (new Date(found.expiresAtIso).getTime() < Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 404 })
  }

  return new Response(found.bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'content-encoding': 'gzip',
      // Recipient page caches server-side; allow CDN to cache the raw bytes.
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}

export async function DELETE(_request: Request, ctx: RouteCtx): Promise<Response> {
  const { id } = await ctx.params
  if (!ID_RE.test(id)) return NextResponse.json({ error: 'bad-id' }, { status: 400 })

  const found = await resolveShareBlob(id)
  if (!found) return NextResponse.json({ error: 'not-found' }, { status: 404 })

  await deleteShareBlob(found.pathname)
  logger.info('share', 'Deleted share', { id })
  return NextResponse.json({ deleted: true }, { status: 200 })
}

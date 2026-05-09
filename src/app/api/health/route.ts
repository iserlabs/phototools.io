import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
      env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    },
    {
      // Uptime monitors need fresh status — never serve a cached response.
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  )
}

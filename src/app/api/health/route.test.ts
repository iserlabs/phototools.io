import { describe, it, expect, afterEach } from 'vitest'
import { GET } from './route'

describe('/api/health', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('returns 200 with status ok', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('ok')
  })

  it('includes timestamp in ISO format', async () => {
    const response = await GET()
    const body = await response.json()
    expect(body.timestamp).toBeDefined()
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
  })

  it('includes version from VERCEL_GIT_COMMIT_SHA', async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = 'abc123f'
    const response = await GET()
    const body = await response.json()
    expect(body.version).toBe('abc123f')
  })

  it('includes env from VERCEL_ENV', async () => {
    process.env.VERCEL_ENV = 'production'
    const response = await GET()
    const body = await response.json()
    expect(body.env).toBe('production')
  })

  it('defaults version to unknown when env var is missing', async () => {
    delete process.env.VERCEL_GIT_COMMIT_SHA
    const response = await GET()
    const body = await response.json()
    expect(body.version).toBe('unknown')
  })

  it('disables caching so monitors always see fresh status', async () => {
    const response = await GET()
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0')
  })
})

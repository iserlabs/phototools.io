import { describe, it, expect } from 'vitest'
import { GET } from './route'

const url = (search: string) => `https://www.phototools.io/api/autofix-canary${search}`

describe('/api/autofix-canary', () => {
  // Sentry PHOTOTOOLS issue 7827727147: a GET with no ?title= threw
  // "TypeError: Cannot read properties of null (reading 'trim')" because the
  // nullable search param was cast to string and handed straight to slug().
  it('returns 400 instead of throwing when title is missing', async () => {
    const response = GET(new Request(url('')))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('missing-title')
  })

  it('returns 400 when title is present but blank', async () => {
    const response = GET(new Request(url('?title=%20%20')))
    expect(response.status).toBe(400)
  })

  it('slugifies a provided title', async () => {
    const response = GET(new Request(url('?title=Hello%20Wide%20World')))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.slug).toBe('hello-wide-world')
  })
})

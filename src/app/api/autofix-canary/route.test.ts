import { describe, it, expect } from 'vitest'
import { GET } from './route'

describe('/api/autofix-canary', () => {
  it('greets the name from the query string', async () => {
    const response = GET(new Request('https://example.com/api/autofix-canary?name=ada'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.greeting).toBe('hello ADA')
  })

  it('falls back to a default greeting when name is absent', async () => {
    const response = GET(new Request('https://example.com/api/autofix-canary'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.greeting).toBe('hello WORLD')
  })

  it('falls back to a default greeting when name is blank', async () => {
    const response = GET(new Request('https://example.com/api/autofix-canary?name=%20'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.greeting).toBe('hello WORLD')
  })
})

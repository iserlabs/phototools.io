import { describe, it, expect } from 'vitest'
import { GET } from './route'

describe('/api/autofix-canary', () => {
  it('builds initials from the name param', async () => {
    const response = GET(new Request('https://www.phototools.io/api/autofix-canary?name=Ada%20Lovelace'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ initials: 'AL' })
  })

  // The reported crash: a bare GET (curl / uptime probe) sends no `name`, so
  // searchParams.get returns null and initials() threw on null.split(' ').
  it('returns 200 with no initials when the name param is absent', async () => {
    const response = GET(new Request('https://www.phototools.io/api/autofix-canary'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ initials: '' })
  })

  it('returns 200 with no initials when the name param is blank', async () => {
    const response = GET(new Request('https://www.phototools.io/api/autofix-canary?name=%20%20'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ initials: '' })
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Callout } from './Callout'

describe('Callout', () => {
  it('renders children with the type styling hook', () => {
    render(<Callout type="tip">Use a tripod.</Callout>)
    const el = screen.getByText('Use a tripod.').closest('aside')
    expect(el).not.toBeNull()
    expect(el?.className).toContain('tip')
  })
})

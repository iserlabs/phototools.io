import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SampleMarkers } from './SampleMarkers'
import type { Sample } from './analyzerState'

const sample = (id: string, x: number, y: number, label = 'blue'): Sample =>
  ({ id, x, y, rgb: { r: 0, g: 0, b: 255 }, hsl: { h: 240, s: 100, l: 50 }, neutral: false, label, locked: false })

const base = {
  width: 400, height: 200,
  markerLabel: (n: number, label: string) => `Sample ${n}: ${label}`,
  removeLabel: 'Remove sample',
  onSelect: vi.fn(), onRemove: vi.fn(), onDragStart: vi.fn(),
}

describe('SampleMarkers', () => {
  it('renders one numbered marker per sample at the projected position', () => {
    render(<SampleMarkers {...base} samples={[sample('a', 0.25, 0.5), sample('b', 0.75, 0.1, 'sky')]} selectedId={null} />)
    const a = screen.getByRole('button', { name: 'Sample 1: blue' })
    expect(a).toHaveStyle({ left: '100px', top: '100px' })
    expect(screen.getByRole('button', { name: 'Sample 2: sky' })).toHaveStyle({ left: '300px', top: '20px' })
    expect(a).toHaveTextContent('1')
  })

  it('marks the selected marker and shows its remove button', () => {
    render(<SampleMarkers {...base} samples={[sample('a', 0.5, 0.5)]} selectedId="a" />)
    expect(screen.getByRole('button', { name: 'Sample 1: blue' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Remove sample' })).toBeInTheDocument()
  })

  it('click selects, remove button removes, pointerdown starts a drag', () => {
    const onSelect = vi.fn(), onRemove = vi.fn(), onDragStart = vi.fn()
    render(<SampleMarkers {...base} onSelect={onSelect} onRemove={onRemove} onDragStart={onDragStart}
      samples={[sample('a', 0.5, 0.5)]} selectedId="a" />)
    const m = screen.getByRole('button', { name: 'Sample 1: blue' })
    fireEvent.click(m)
    expect(onSelect).toHaveBeenCalledWith('a')
    fireEvent.pointerDown(m)
    expect(onDragStart).toHaveBeenCalledWith('a', expect.anything())
    fireEvent.click(screen.getByRole('button', { name: 'Remove sample' }))
    expect(onRemove).toHaveBeenCalledWith('a')
  })
})

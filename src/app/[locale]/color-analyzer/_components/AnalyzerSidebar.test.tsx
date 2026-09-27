import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createRef } from 'react'
import { AnalyzerSidebar, type AnalyzerSidebarProps } from './AnalyzerSidebar'
import { SampleCard, type SampleCardProps } from './SampleCard'
import type { Sample } from './analyzerState'

vi.mock('@/components/shared/ToolActions', () => ({ ToolActions: () => <div data-testid="tool-actions" /> }))

const sample = (id: string, h = 200, neutral = false): Sample =>
  ({ id, x: 0.5, y: 0.5, rgb: { r: 10, g: 20, b: 30 }, hsl: { h, s: 60, l: 40 }, neutral, label: 'sky', locked: false })

const cardLabels = { lock: 'Lock', unlock: 'Unlock', remove: 'Remove', copied: 'Copied', neutral: 'Neutral, not scored', labelPlaceholder: 'Label', suggested: 'Suggested' }

function cardProps(over: Partial<SampleCardProps> = {}): SampleCardProps {
  return {
    index: 1, sample: sample('a'), colorName: 'sky blue', result: null, nudge: null, selected: false, showGuide: false,
    labels: cardLabels, onSelect: vi.fn(), onLabelChange: vi.fn(), onLock: vi.fn(), onRemove: vi.fn(), onNudgePosition: vi.fn(),
    ...over,
  }
}

const harmonyLabels = { complementary: 'Complementary', 'split-complementary': 'Split Complementary', analogous: 'Analogous', triadic: 'Triadic', tetradic: 'Tetradic', monochromatic: 'Monochromatic', custom: 'Custom' }

function sidebarProps(over: Partial<AnalyzerSidebarProps> = {}): AnalyzerSidebarProps {
  return {
    toolSlug: 'color-analyzer', exportCanvasRef: createRef<HTMLCanvasElement>(), buildExportCanvas: vi.fn(),
    harmony: 'complementary', onHarmony: vi.fn(), onClosestFit: vi.fn(), harmonyLabels, closestFit: null,
    labels: { colorScheme: 'Color scheme', closestFit: 'Closest fit', closestSentence: null, suggestion: 'Great for: x', samplesHeading: 'Samples', splitAngle: 'Split angle:', spread: 'Spread:', rectangleWidth: 'Rectangle width:', square: '(square)' },
    params: { splitAngle: 30, analogousSpread: 30, tetradicOffset: 60 }, onParams: vi.fn(),
    keyCard: null, sampleCards: [],
    ...over,
  }
}

describe('SampleCard', () => {
  it('shows index, label, hex and HSL, and copies the hex on click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<SampleCard {...cardProps()} />)
    expect(screen.getByDisplayValue('sky')).toBeInTheDocument()
    expect(screen.getByText('sky blue')).toBeInTheDocument()
    expect(screen.getByText('H 200° · S 60% · L 40%')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '#0a141e' }))
    expect(writeText).toHaveBeenCalledWith('#0a141e')
  })

  it('renders the nudge line and suggested swatch in guide mode', () => {
    render(<SampleCard {...cardProps({ showGuide: true, nudge: 'Slight nudge toward cyan',
      result: { id: 'a', targetHue: 185, delta: -15, band: 'slight', suggestedHex: '#123456' } })} />)
    expect(screen.getByText('Slight nudge toward cyan')).toBeInTheDocument()
    expect(screen.getByText('#123456')).toBeInTheDocument()
  })

  it('shows the neutral note instead of a nudge for neutral samples', () => {
    render(<SampleCard {...cardProps({ sample: sample('g', 0, true), showGuide: true })} />)
    expect(screen.getByText('Neutral, not scored')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lock' })).toBeNull()
  })

  it('lock toggles, Delete key removes, arrow keys nudge position', () => {
    const onLock = vi.fn(), onRemove = vi.fn(), onNudgePosition = vi.fn()
    render(<SampleCard {...cardProps({ onLock, onRemove, onNudgePosition, selected: true })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lock' }))
    expect(onLock).toHaveBeenCalledWith(true)
    const card = screen.getByRole('listitem')
    fireEvent.keyDown(card, { key: 'Delete' })
    expect(onRemove).toHaveBeenCalled()
    fireEvent.keyDown(card, { key: 'ArrowRight' })
    expect(onNudgePosition).toHaveBeenCalledWith(1, 0)
    fireEvent.keyDown(card, { key: 'ArrowUp' })
    expect(onNudgePosition).toHaveBeenCalledWith(0, -1)
  })
})

describe('AnalyzerSidebar', () => {
  it('renders the key card when there are no samples', () => {
    render(<AnalyzerSidebar {...sidebarProps({ keyCard: {
      hue: 200, saturation: 70, lightness: 50, hex: '#2680b3', onHue: vi.fn(), onSaturation: vi.fn(), onLightness: vi.fn(), onHex: vi.fn(),
      labels: { keyColor: 'Key Color', hue: 'Hue:', saturation: 'Saturation:', lightness: 'Lightness:' } } })} />)
    expect(screen.getByText('Key Color')).toBeInTheDocument()
    expect(screen.getAllByRole('slider')).toHaveLength(3)
    expect(screen.getByRole('slider', { name: 'Hue:' })).toBeInTheDocument()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('renders one card per sample and no key card otherwise', () => {
    render(<AnalyzerSidebar {...sidebarProps({ sampleCards: [cardProps(), cardProps({ index: 2, sample: sample('b') })] })} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.queryByText('Key Color')).toBeNull()
  })

  it('harmony buttons call onHarmony and the closest-fit control calls onClosestFit', () => {
    const onHarmony = vi.fn(), onClosestFit = vi.fn()
    render(<AnalyzerSidebar {...sidebarProps({ onHarmony, onClosestFit, closestFit: { type: 'triadic', meanError: 9 },
      labels: { ...sidebarProps().labels, closestSentence: 'Your photo is closest to triadic (mean 9° off)' } })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Analogous' }))
    expect(onHarmony).toHaveBeenCalledWith('analogous')
    fireEvent.click(screen.getByRole('button', { name: /Closest fit/ }))
    expect(onClosestFit).toHaveBeenCalledWith('triadic')
    expect(onHarmony).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Your photo is closest to triadic (mean 9° off)')).toBeInTheDocument()
  })

  it('shows the parameter slider that matches the harmony', () => {
    const { rerender } = render(<AnalyzerSidebar {...sidebarProps({ harmony: 'split-complementary' })} />)
    expect(screen.getByText(/Split angle:/)).toBeInTheDocument()
    rerender(<AnalyzerSidebar {...sidebarProps({ harmony: 'triadic' })} />)
    expect(screen.queryByText(/Split angle:/)).toBeNull()
  })
})

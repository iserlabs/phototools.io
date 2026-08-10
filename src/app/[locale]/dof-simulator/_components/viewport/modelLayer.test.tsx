import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ModelLayer } from './ModelLayer'
import { getSubjectById } from '@/lib/data/dofSimulator/models'

const subject = getSubjectById('woman-a')

describe('ModelLayer', () => {
  it('renders one img per slice for the active crop level', () => {
    const { container } = render(
      <ModelLayer subject={subject}
        derived={{ figureFrac: 4, cropLevel: 'face', sensorWMm: 36, cocMm: 0.03 }}
        optics={{ focalLength: 135, aperture: 1.4, distanceM: 1.2 }}
        viewportPx={{ w: 900, h: 600 }} />,
    )
    expect(container.querySelectorAll('img')).toHaveLength(subject.crops.face.slices.length)
  })
  it('blurs off-plane slices but not the eye-plane slice', () => {
    const { container } = render(
      <ModelLayer subject={subject}
        derived={{ figureFrac: 4, cropLevel: 'face', sensorWMm: 36, cocMm: 0.03 }}
        optics={{ focalLength: 135, aperture: 1.4, distanceM: 1.2 }}
        viewportPx={{ w: 900, h: 600 }} />,
    )
    const imgs = [...container.querySelectorAll('img')] as HTMLImageElement[]
    const eyePlane = imgs[1]  // slices ordered near→mid→far; mid = offset 0
    expect(eyePlane.style.filter).toBe('')
    expect(imgs[0].style.filter).toMatch(/blur/)
  })

  // Item 4 (regression-repair): outside split mode, the subject centers on
  // the full viewport midpoint (50%), same as always.
  it('centers on the full viewport midpoint when splitDividerPos is omitted', () => {
    const { container } = render(
      <ModelLayer subject={subject}
        derived={{ figureFrac: 4, cropLevel: 'face', sensorWMm: 36, cocMm: 0.03 }}
        optics={{ focalLength: 135, aperture: 1.4, distanceM: 1.2 }}
        viewportPx={{ w: 900, h: 600 }} />,
    )
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.style.left).toBe('50%')
  })

  // Item 4 (regression-repair): CenterStage.tsx used to hardcode `left: 50%`
  // regardless of A/B mode, so in split mode the single (A-only) subject
  // straddled the divider instead of reading as belonging to pane A. With
  // splitDividerPos supplied, the subject must center within pane A's OWN
  // width ([0, splitDividerPos]) -- i.e. at splitDividerPos/2 of the full
  // viewport, not at the full-width 50%.
  it('centers within pane A only when splitDividerPos is supplied', () => {
    const { container } = render(
      <ModelLayer subject={subject}
        derived={{ figureFrac: 4, cropLevel: 'face', sensorWMm: 36, cocMm: 0.03 }}
        optics={{ focalLength: 135, aperture: 1.4, distanceM: 1.2 }}
        viewportPx={{ w: 900, h: 600 }}
        splitDividerPos={0.5} />,
    )
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.style.left).toBe('25%') // 0.5 * 50
    expect(img.style.left).not.toBe('50%')
  })
})

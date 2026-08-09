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
})

import { describe, it, expect } from 'vitest'
import { calcFOV } from '@/lib/math/fov'
import { calcDoF } from '@/lib/math/dof'
import { calcEV, shutterWithNd, reciprocalRule } from '@/lib/math/exposure'
import { rule500, ruleNPF } from '@/lib/math/startrail'
import { pixelPitch, diffractionLimitedAperture } from '@/lib/math/diffraction'
import { kelvinToRgb, complementary, analogous, triadic, splitComplementary, tetradic } from '@/lib/math/color'
import { calcCameraDistance } from '@/lib/math/compression'
import { SENSORS } from '@/lib/data/sensors'
import { FOCAL_LENGTHS } from '@/lib/data/focalLengths'
import { TOOLS, getToolBySlug, getLiveTools } from '@/lib/data/tools'
import { GLOSSARY } from '@/lib/data/glossary'
import { getAllSkeletons } from '@/lib/data/education'
import { EXPOSURE_SCENES } from '@/lib/data/exposureScenes'
import { ASPECT_RATIOS, TEXTURES } from '@/lib/data/frameStudio'
import { TEXTURE_PRESETS } from '@/lib/math/frame-texture'
import { WB_PRESETS } from '@/lib/data/whiteBalance'
import { HARMONY_KEYS } from '@/lib/data/colorSchemeGenerator'
import { locales, defaultLocale, localeNames, localeOpenGraph, localeFlags } from '@/lib/i18n/routing'

describe('FOV calculations with real sensor data', () => {
  it('all sensors produce valid FOV at all focal lengths', () => {
    for (const sensor of SENSORS) {
      for (const fl of FOCAL_LENGTHS) {
        const fov = calcFOV(fl.value, sensor.cropFactor)
        expect(fov.horizontal).toBeGreaterThan(0)
        expect(fov.horizontal).toBeLessThan(180)
        expect(fov.vertical).toBeGreaterThan(0)
        expect(fov.vertical).toBeLessThan(fov.horizontal)
      }
    }
  })

  it('larger crop factor narrows FOV at same focal length', () => {
    const ff = calcFOV(50, 1.0)
    const apsc = calcFOV(50, 1.5)
    const m43 = calcFOV(50, 2.0)
    expect(ff.horizontal).toBeGreaterThan(apsc.horizontal)
    expect(apsc.horizontal).toBeGreaterThan(m43.horizontal)
  })
})

describe('DoF calculations with real sensor data', () => {
  it('all sensors produce valid DoF at common settings', () => {
    for (const sensor of SENSORS) {
      const coc = 0.03 / sensor.cropFactor
      const result = calcDoF({ focalLength: 50, aperture: 5.6, distance: 3, coc })
      expect(result.nearFocus).toBeGreaterThan(0)
      expect(result.nearFocus).toBeLessThan(3)
      expect(result.farFocus).toBeGreaterThan(3)
      expect(result.hyperfocal).toBeGreaterThan(0)
    }
  })
})

describe('Exposure math consistency', () => {
  it('EV is consistent across equivalent exposures', () => {
    const ev1 = calcEV(8, 1/125)    // f/8, 1/125s
    const ev2 = calcEV(5.6, 1/250)  // f/5.6, 1/250s - same EV
    expect(ev1).toBeCloseTo(ev2, 0)
  })

  it('ND filter doubles shutter speed per stop', () => {
    const base = 1/125
    const nd1 = shutterWithNd(base, 1)  // 1 stop
    const nd2 = shutterWithNd(base, 2)  // 2 stops
    expect(nd1).toBeCloseTo(base * 2, 6)
    expect(nd2).toBeCloseTo(base * 4, 6)
  })
})

describe('Star trail calculations with real sensor data', () => {
  it('wider lens allows longer exposure', () => {
    const wide = rule500(14, 1.0)
    const tele = rule500(200, 1.0)
    expect(wide).toBeGreaterThan(tele)
  })
})

describe('Tool registry integrity', () => {
  it('every tool has a unique slug', () => {
    const slugs = TOOLS.map(t => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('at least one tool is live', () => {
    expect(getLiveTools().length).toBeGreaterThan(0)
  })

  it('glossary relatedTool references resolve', () => {
    for (const term of GLOSSARY) {
      if (term.relatedTool) {
        expect(getToolBySlug(term.relatedTool)).toBeDefined()
      }
    }
  })
})

describe('Color temperature produces valid RGB', () => {
  it('daylight (6500K) is near-white', () => {
    const { r, g, b } = kelvinToRgb(6500)
    expect(r).toBeGreaterThan(200)
    expect(g).toBeGreaterThan(200)
    expect(b).toBeGreaterThan(200)
  })

  it('complementary hues are 180 degrees apart', () => {
    const hues = complementary(90)
    expect(hues).toHaveLength(2)
    expect(Math.abs(hues[1] - hues[0])).toBeCloseTo(180, 0)
  })
})

describe('Sensor dimensions consistency', () => {
  it('sensor physical width correlates inversely with crop factor', () => {
    const ff = SENSORS.find(s => s.id === 'ff')!
    for (const sensor of SENSORS) {
      if (sensor.id === 'ff') continue
      if (sensor.cropFactor > 1) {
        expect(sensor.w!).toBeLessThan(ff.w!)
      } else if (sensor.cropFactor < 1) {
        expect(sensor.w!).toBeGreaterThan(ff.w!)
      }
    }
  })

  it('crop factor roughly equals 36/sensorWidth for landscape sensors', () => {
    // Full frame is 36mm wide, crop factor ~= 36/w (diagonal-based, so approximate)
    for (const sensor of SENSORS) {
      const approxCrop = 36 / sensor.w!
      // Allow generous tolerance since crop factor is diagonal-based, not width-based
      expect(sensor.cropFactor).toBeCloseTo(approxCrop, 0)
    }
  })
})

describe('ND filter math matches data', () => {
  it('ND filter stops produce correct shutter multiplication', () => {
    const base = 1 / 125
    // 3-stop ND should give 8x longer exposure
    const nd3 = shutterWithNd(base, 3)
    expect(nd3).toBeCloseTo(base * 8, 6)
    // 10-stop ND should give 1024x longer exposure
    const nd10 = shutterWithNd(base, 10)
    expect(nd10).toBeCloseTo(base * 1024, 6)
  })
})

describe('Diffraction limits with real sensor data', () => {
  it('higher resolution sensors hit diffraction limit at wider apertures', () => {
    const ff = SENSORS.find((s) => s.id === 'ff')!
    const pitch24 = pixelPitch(ff.w!, 24)
    const pitch50 = pixelPitch(ff.w!, 50)
    const limit24 = diffractionLimitedAperture(pitch24)
    const limit50 = diffractionLimitedAperture(pitch50)
    expect(limit50).toBeLessThan(limit24)
  })

  it('smaller sensors hit diffraction earlier at same resolution', () => {
    const apsc = SENSORS.find((s) => s.id === 'apsc_n')!
    const ff = SENSORS.find((s) => s.id === 'ff')!
    const pitchAps = pixelPitch(apsc.w!, 24)
    const pitchFf = pixelPitch(ff.w!, 24)
    expect(diffractionLimitedAperture(pitchAps)).toBeLessThan(diffractionLimitedAperture(pitchFf))
  })
})

describe('Reciprocal rule with real sensors', () => {
  it('crop factor shortens safe shutter speed', () => {
    const ff = reciprocalRule(200, 1.0, 0)
    const apsc = reciprocalRule(200, 1.5, 0)
    expect(apsc).toBeLessThan(ff) // APS-C needs faster shutter
  })

  it('IBIS allows longer shutter at every focal length', () => {
    for (const fl of [24, 50, 85, 200]) {
      const noStab = reciprocalRule(fl, 1.0, 0)
      const withStab = reciprocalRule(fl, 1.0, 4)
      expect(withStab).toBeGreaterThan(noStab)
    }
  })
})

describe('Star trail rules with real sensors', () => {
  it('NPF rule gives shorter max exposure than rule of 500', () => {
    const ff = SENSORS.find((s) => s.id === 'ff')!
    const pitch = pixelPitch(ff.w!, 24)
    const r500 = rule500(50, 1.0)
    const npf = ruleNPF(2.8, 50, pitch)
    expect(npf).toBeLessThan(r500)
  })
})

describe('Compression matches FOV expectations', () => {
  it('telephoto compression requires farther distance to match framing', () => {
    const d85 = calcCameraDistance(85, 50, 5)
    const d200 = calcCameraDistance(200, 50, 5)
    expect(d200).toBeGreaterThan(d85)
    // At those distances, FOV should narrow proportionally
    const fov85 = calcFOV(85, 1.0)
    const fov200 = calcFOV(200, 1.0)
    expect(fov200.horizontal).toBeLessThan(fov85.horizontal)
  })
})

describe('Education and tool registry alignment', () => {
  it('every education entry has a matching tool or known sub-feature', () => {
    const toolSlugs = new Set(TOOLS.map((t) => t.slug))
    const knownSubFeatures = new Set(['histogram'])
    for (const edu of getAllSkeletons()) {
      expect(toolSlugs.has(edu.slug) || knownSubFeatures.has(edu.slug)).toBe(true)
    }
  })

  it('every live tool has education content', () => {
    // Tools intentionally shipped without a LearnPanel / education layer.
    // The Lightroom Catalog Analyzer is a data-dashboard file tool whose right
    // sidebar is a section navigator, not an education panel (by design).
    const EDUCATION_EXEMPT = new Set(['lightroom-catalog-analyzer'])
    const liveTools = getLiveTools().filter((t) => !EDUCATION_EXEMPT.has(t.slug))
    for (const tool of liveTools) {
      const edu = getAllSkeletons().find((e) => e.slug === tool.slug)
      expect(edu).toBeDefined()
    }
  })
})

describe('Exposure scene assets reference valid paths', () => {
  it('all scene asset filenames include the scene ID', () => {
    for (const scene of EXPOSURE_SCENES) {
      expect(scene.assets.photo).toContain(scene.id)
      expect(scene.assets.depthMap).toContain(scene.id)
      expect(scene.assets.motionMask).toContain(scene.id)
    }
  })
})

describe('Frame studio textures align with math module', () => {
  it('every texture ID in data has a matching texture preset in math', () => {
    for (const t of TEXTURES) {
      expect(TEXTURE_PRESETS[t.id as keyof typeof TEXTURE_PRESETS]).toBeDefined()
    }
  })
})

describe('White balance presets produce valid colors', () => {
  it('all preset kelvin values produce RGB in 0-255 range', () => {
    for (const preset of WB_PRESETS) {
      const { r, g, b } = kelvinToRgb(preset.kelvin)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThanOrEqual(255)
      expect(g).toBeGreaterThanOrEqual(0)
      expect(g).toBeLessThanOrEqual(255)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(255)
    }
  })

  it('warmer presets have higher red component', () => {
    const warm = kelvinToRgb(WB_PRESETS[0].kelvin)  // Candle 1900K
    const cool = kelvinToRgb(WB_PRESETS[WB_PRESETS.length - 1].kelvin)  // Blue Sky 10000K
    expect(warm.r).toBeGreaterThan(cool.r)
  })
})

describe('Color harmony functions match HARMONY_KEYS', () => {
  const harmonyFns: Record<string, (hue: number) => number[]> = {
    complementary, analogous, triadic, 'split-complementary': splitComplementary, tetradic,
  }

  it('every harmony key has a matching function that returns valid hues', () => {
    for (const hk of HARMONY_KEYS) {
      const fn = harmonyFns[hk.value]
      expect(fn).toBeDefined()
      const hues = fn(180)
      expect(hues.length).toBeGreaterThanOrEqual(2)
      for (const h of hues) {
        expect(h).toBeGreaterThanOrEqual(0)
        expect(h).toBeLessThan(360)
      }
    }
  })
})

describe('Aspect ratio consistency', () => {
  it('original and free entries have w:0, h:0', () => {
    const original = ASPECT_RATIOS.find(a => a.value === 'original')
    const free = ASPECT_RATIOS.find(a => a.value === null)
    expect(original?.w).toBe(0)
    expect(original?.h).toBe(0)
    expect(free?.w).toBe(0)
    expect(free?.h).toBe(0)
  })
})

describe('i18n routing config consistency', () => {
  it('defaultLocale is in the locales list', () => {
    expect(locales).toContain(defaultLocale)
  })

  it('every locale has a display name', () => {
    for (const locale of locales) {
      expect(localeNames[locale]).toBeTruthy()
    }
  })

  it('every locale has an OpenGraph locale', () => {
    for (const locale of locales) {
      expect(localeOpenGraph[locale]).toMatch(/^[a-z]{2,3}_[A-Z]{2}$/)
    }
  })

  it('every locale has a flag emoji (regional indicator pair)', () => {
    // A flag emoji is exactly two regional indicator symbols (U+1F1E6..U+1F1FF)
    const RIS_RANGE = /^[\u{1F1E6}-\u{1F1FF}]{2}$/u
    for (const locale of locales) {
      expect(localeFlags[locale]).toMatch(RIS_RANGE)
    }
  })

  it('localeNames, localeOpenGraph, and localeFlags cover exactly the locales list', () => {
    const nameKeys = Object.keys(localeNames).sort()
    const ogKeys = Object.keys(localeOpenGraph).sort()
    const flagKeys = Object.keys(localeFlags).sort()
    const sortedLocales = [...locales].sort()
    expect(nameKeys).toEqual(sortedLocales)
    expect(ogKeys).toEqual(sortedLocales)
    expect(flagKeys).toEqual(sortedLocales)
  })
})

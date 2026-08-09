import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { CenterStage, subjectOptics } from './CenterStage'
import { computeDerived } from './state/useDofDerived'
import { computeExportLayout } from './export/exportLayout'
import { ModelLayer } from './viewport/ModelLayer'
import { calcDefocusBlur } from '@/lib/math/dof'
import { getSubjectById } from '@/lib/data/dofSimulator/models'
import { getBackgroundById } from '@/lib/data/dofSimulator/backgrounds'
import type { OpticsApi, OpticsState } from './state/useOptics'
import type { DofStateApi } from './state/useDofState'
import enMessages from '@/lib/i18n/messages/en/tools/dof-simulator.json'

// Regression for: CenterStage was feeding ModelLayer/useImageExport the raw
// (pre-teleconverter) focal length while `derived.backgroundBlurMm`/`dof`
// correctly used `effectiveFl` — with a 2x teleconverter engaged, the subject
// rendered visibly under-blurred vs. the background, on screen and in the
// exported PNG. `subjectOptics` is the single place both call sites now
// route through.

const RAW_FL = 100
const TC20_FACTOR = 2 // src/lib/data/dofSimulator/teleconverters.ts: tc20 -> flFactor 2
const EFFECTIVE_FL = RAW_FL * TC20_FACTOR // 200

const baseOptics: OpticsState = {
  focalLength: RAW_FL,
  aperture: 2.8,
  distanceM: 3,
  sensorId: 'ff',
  cameraId: null,
  lensId: null,
  teleconverterId: 'tc20',
  customCocMm: null,
  backgroundDistanceM: null,
}

const subject = getSubjectById('woman-a')
const background = getBackgroundById('city-skyline')

describe('subjectOptics', () => {
  it('substitutes the teleconverter-adjusted effective focal length for the raw one', () => {
    const derived = computeDerived({
      optics: baseOptics,
      subject,
      background,
      orientation: 'landscape',
      bokeh: 'disc',
    })
    expect(derived.effectiveFl).toBe(EFFECTIVE_FL)

    const result = subjectOptics(baseOptics, derived.effectiveFl)
    expect(result.focalLength).toBe(EFFECTIVE_FL)
    expect(result.focalLength).not.toBe(baseOptics.focalLength)
    expect(result.aperture).toBe(baseOptics.aperture)
    expect(result.distanceM).toBe(baseOptics.distanceM)
  })
})

describe('teleconverter-adjusted subject blur — ModelLayer path', () => {
  it('renders slice blur matching calcDefocusBlur at the doubled focal length, not the raw one', () => {
    const derived = computeDerived({
      optics: baseOptics,
      subject,
      background,
      orientation: 'landscape',
      bokeh: 'disc',
    })
    const fixedOptics = subjectOptics(baseOptics, derived.effectiveFl)
    const viewportPx = { w: 900, h: 600 }

    const { container } = render(
      <ModelLayer
        subject={subject}
        derived={{
          figureFrac: derived.figureFrac,
          cropLevel: derived.cropLevel,
          sensorWMm: derived.sensorWMm,
          cocMm: derived.cocMm,
        }}
        optics={fixedOptics}
        viewportPx={viewportPx}
      />,
    )
    const imgs = [...container.querySelectorAll('img')] as HTMLImageElement[]
    const crop = subject.crops[derived.cropLevel]
    // Pick an off-plane slice (nonzero depthOffsetMm) to compare real blur px.
    const offPlaneIndex = crop.slices.findIndex((s) => s.depthOffsetMm !== 0)
    expect(offPlaneIndex).toBeGreaterThanOrEqual(0)
    const slice = crop.slices[offPlaneIndex]

    const blurMmAtEffective = calcDefocusBlur({
      focalLength: EFFECTIVE_FL,
      aperture: baseOptics.aperture,
      focusDistance: baseOptics.distanceM,
      targetDistance: baseOptics.distanceM + slice.depthOffsetMm / 1000,
    })
    const blurMmAtRaw = calcDefocusBlur({
      focalLength: RAW_FL,
      aperture: baseOptics.aperture,
      focusDistance: baseOptics.distanceM,
      targetDistance: baseOptics.distanceM + slice.depthOffsetMm / 1000,
    })
    expect(blurMmAtEffective).not.toBeCloseTo(blurMmAtRaw, 5)

    // The rendered filter must reflect the doubled-FL (larger, at this
    // geometry) blur radius, proving ModelLayer received the effective FL.
    const renderedFilter = imgs[offPlaneIndex].style.filter
    expect(renderedFilter).toMatch(/blur\(([\d.]+)px\)/)
    const renderedPx = Number(/blur\(([\d.]+)px\)/.exec(renderedFilter)?.[1])
    expect(renderedPx).toBeGreaterThan(0)
    expect(blurMmAtEffective).toBeGreaterThan(blurMmAtRaw)
  })
})

describe('teleconverter-adjusted subject blur — export path', () => {
  it('computeExportLayout slice blur matches the doubled-focal-length figure, not the raw one', () => {
    const derived = computeDerived({
      optics: baseOptics,
      subject,
      background,
      orientation: 'landscape',
      bokeh: 'disc',
    })
    const fixedOptics = subjectOptics(baseOptics, derived.effectiveFl)
    const viewportPx = { w: 900, h: 600 }
    const exportDerived = { figureFrac: derived.figureFrac, cropLevel: derived.cropLevel, sensorWMm: derived.sensorWMm }

    const layoutFixed = computeExportLayout(viewportPx, subject, exportDerived, fixedOptics, 1)
    const layoutRaw = computeExportLayout(viewportPx, subject, exportDerived, baseOptics, 1)

    const crop = subject.crops[derived.cropLevel]
    const offPlaneIndex = crop.slices.findIndex((s) => s.depthOffsetMm !== 0)
    expect(offPlaneIndex).toBeGreaterThanOrEqual(0)

    expect(layoutFixed.slices[offPlaneIndex].blurPx).toBeGreaterThan(0)
    expect(layoutFixed.slices[offPlaneIndex].blurPx).not.toBeCloseTo(layoutRaw.slices[offPlaneIndex].blurPx, 5)
    expect(layoutFixed.slices[offPlaneIndex].blurPx).toBeGreaterThan(layoutRaw.slices[offPlaneIndex].blurPx)
  })
})

// --- Full CenterStage render: proves the *wiring* itself (CenterStage.tsx's
// JSX), not just the math helper in isolation. jsdom has neither
// ResizeObserver nor real WebGL2, so both are locally stubbed for this
// block only: ResizeObserver synchronously reports a fixed viewport size
// (driving useViewportSize), and canvas.getContext('webgl2') is forced to
// return null so Viewport takes its already-built, already-tested CSS
// fallback path — which still mounts `children` (ModelLayer et al.), giving
// us a real DOM to assert on without needing an actual GPU context.

class StubResizeObserver {
  #cb: ResizeObserverCallback
  constructor(cb: ResizeObserverCallback) {
    this.#cb = cb
  }
  observe(target: Element) {
    this.#cb(
      [{ target, contentRect: { width: 900, height: 600 } } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    )
  }
  unobserve() {}
  disconnect() {}
}

function makeOptics(overrides: Partial<OpticsState> = {}): OpticsApi {
  const state: OpticsState = {
    focalLength: 85, aperture: 2.8, distanceM: 3, sensorId: 'ff',
    cameraId: null, lensId: null, teleconverterId: 'none',
    customCocMm: null, backgroundDistanceM: null,
    ...overrides,
  }
  return {
    ...state,
    setFocalLength: vi.fn(), setAperture: vi.fn(), setDistanceM: vi.fn(),
    setSensorId: vi.fn(), setCameraId: vi.fn(), setLensId: vi.fn(),
    setTeleconverterId: vi.fn(), setCustomCocMm: vi.fn(), setBackgroundDistanceM: vi.fn(),
  }
}

function makeDofState(opticsApi: OpticsApi): DofStateApi {
  const derived = computeDerived({
    optics: opticsApi, subject, background, orientation: 'landscape', bokeh: 'disc',
  })
  return {
    optics: opticsApi,
    appearance: {
      subjectId: subject.id, backgroundId: background.id, orientation: 'landscape',
      setSubjectId: vi.fn(), setBackgroundId: vi.fn(), setOrientation: vi.fn(),
    },
    framing: {
      activePreset: null, lockFov: false, lockedFrameHeightMm: null,
      setActivePreset: vi.fn(), setLockFov: vi.fn(), setLockedFrameHeightMm: vi.fn(),
    },
    uiPrefs: { advanced: false, imperial: false, setAdvanced: vi.fn(), setImperial: vi.fn() },
    ab: {
      mode: 'off', setMode: vi.fn(), activeSet: 'a', setActiveSet: vi.fn(),
      dividerPos: 0.5, setDividerPos: vi.fn(), b: makeOptics(),
    },
    saved: { rows: [], addRow: vi.fn(), removeRow: vi.fn(), sortBy: vi.fn() },
    derived,
    derivedB: null,
    bokeh: 'disc',
    setBokeh: vi.fn(),
    changeFocalLength: vi.fn(() => ({ clamped: false })),
    changeDistance: vi.fn(() => ({ clamped: false })),
    applyFramingPreset: vi.fn(),
    reset: vi.fn(),
  }
}

describe('CenterStage (full render)', () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', StubResizeObserver)
    originalGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function stubbedGetContext(
      this: HTMLCanvasElement,
      contextId: string,
      options?: unknown,
    ) {
      if (contextId === 'webgl2') return null
      return originalGetContext.call(this, contextId as '2d', options as CanvasRenderingContext2DSettings)
    } as typeof HTMLCanvasElement.prototype.getContext
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    HTMLCanvasElement.prototype.getContext = originalGetContext
  })

  it('wires the teleconverter-adjusted focal length into the actual rendered ModelLayer DOM', () => {
    const opticsApi = makeOptics({ focalLength: RAW_FL, teleconverterId: 'tc20' })
    const dofState = makeDofState(opticsApi)
    expect(dofState.derived.effectiveFl).toBe(EFFECTIVE_FL)

    const { container } = render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <CenterStage dofState={dofState} subject={subject} background={background} onDistanceChange={vi.fn()} />
      </NextIntlClientProvider>,
    )

    const crop = subject.crops[dofState.derived.cropLevel]
    const offPlaneIndex = crop.slices.findIndex((s) => s.depthOffsetMm !== 0)
    expect(offPlaneIndex).toBeGreaterThanOrEqual(0)
    const slice = crop.slices[offPlaneIndex]

    // Scope by `src`, not DOM position — Viewport's WebGL2-unavailable CSS
    // fallback also renders an `<img>` (the background), which would shift
    // naive index-based lookups.
    const sliceImg = container.querySelector<HTMLImageElement>(`img[src="${slice.src}"]`)
    expect(sliceImg).not.toBeNull()
    const rendered = /blur\(([\d.]+)px\)/.exec(sliceImg?.style.filter ?? '')
    expect(rendered).not.toBeNull()
    const renderedPx = Number(rendered?.[1])

    const expectedBlurMm = calcDefocusBlur({
      focalLength: EFFECTIVE_FL,
      aperture: opticsApi.aperture,
      focusDistance: opticsApi.distanceM,
      targetDistance: opticsApi.distanceM + slice.depthOffsetMm / 1000,
    })
    const buggyBlurMm = calcDefocusBlur({
      focalLength: RAW_FL,
      aperture: opticsApi.aperture,
      focusDistance: opticsApi.distanceM,
      targetDistance: opticsApi.distanceM + slice.depthOffsetMm / 1000,
    })
    const viewportWPx = 900
    const expectedPx = Math.min(24, (expectedBlurMm / dofState.derived.sensorWMm) * viewportWPx)
    const buggyPx = Math.min(24, (buggyBlurMm / dofState.derived.sensorWMm) * viewportWPx)

    expect(renderedPx).toBeCloseTo(expectedPx, 1)
    expect(renderedPx).not.toBeCloseTo(buggyPx, 1)
  })
})

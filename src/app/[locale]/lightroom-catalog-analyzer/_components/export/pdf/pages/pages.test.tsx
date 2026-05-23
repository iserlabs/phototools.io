import { describe, expect, it } from 'vitest'
import { isValidElement } from 'react'
import { makePdfBlob, testGlobalStrings, testSectionStrings } from './__page-test-helper__'
import { YearInReviewPage } from './YearInReviewPage'
import { YearToYearPage } from './YearToYearPage'
import { OverviewPage } from './OverviewPage'
import { GearPage } from './GearPage'
import { FocalLengthPage } from './FocalLengthPage'
import { FocalLengthPerZoomPage } from './FocalLengthPerZoomPage'
import { AperturesPage } from './AperturesPage'
import { TimeOfDayPage } from './TimeOfDayPage'
import { HeatmapPage } from './HeatmapPage'
import { GpsPage } from './GpsPage'
import { CurationPage } from './CurationPage'
import { EditIntensityPage } from './EditIntensityPage'
import { RatingsPage } from './RatingsPage'
import { KeywordsPage } from './KeywordsPage'
import { BurstsPage } from './BurstsPage'
import { PeriodComparisonPage } from './PeriodComparisonPage'
import { CatalogHealthPage } from './CatalogHealthPage'

const blob = makePdfBlob()
const g = testGlobalStrings
const s = testSectionStrings

describe('PDF section pages', () => {
  it('YearInReviewPage builds a valid element with and without a chart', () => {
    expect(isValidElement(YearInReviewPage({ blob, s, g, chart: 'data:image/png;base64,AAA' }))).toBe(true)
    expect(isValidElement(YearInReviewPage({ blob, s, g }))).toBe(true)
  })

  it('YearToYearPage builds a valid element', () => {
    expect(isValidElement(YearToYearPage({ blob, s, g }))).toBe(true)
  })

  it('OverviewPage builds a valid element', () => {
    expect(isValidElement(OverviewPage({ blob, s, g }))).toBe(true)
  })

  it('GearPage builds a valid element', () => {
    expect(isValidElement(GearPage({ blob, s, g, bodiesChart: 'data:image/png;base64,A', lensesChart: 'data:image/png;base64,B' }))).toBe(true)
  })

  it('FocalLengthPage builds a valid element (with + without prime)', () => {
    expect(isValidElement(FocalLengthPage({ blob, s, g, chart: 'data:image/png;base64,A' }))).toBe(true)
    const noPrime = makePdfBlob(); noPrime.focalLength.bestOnePrime = null
    expect(isValidElement(FocalLengthPage({ blob: noPrime, s, g }))).toBe(true)
  })

  it('FocalLengthPerZoomPage builds a valid element', () => {
    expect(isValidElement(FocalLengthPerZoomPage({ blob, s, g, chart: 'data:image/png;base64,A' }))).toBe(true)
  })

  it('AperturesPage builds a valid element', () => {
    expect(isValidElement(AperturesPage({ blob, s, g, chart: 'data:image/png;base64,A' }))).toBe(true)
  })

  it('TimeOfDayPage builds a valid element', () => {
    expect(isValidElement(TimeOfDayPage({ blob, s, g, chart: 'data:image/png;base64,A' }))).toBe(true)
  })

  it('HeatmapPage builds a valid element', () => {
    expect(isValidElement(HeatmapPage({ blob, s, g, chart: 'data:image/png;base64,A' }))).toBe(true)
  })

  it('GpsPage builds a valid element', () => {
    expect(isValidElement(GpsPage({ blob, s, g, chart: 'data:image/png;base64,A' }))).toBe(true)
  })

  it('CurationPage builds a valid element', () => {
    expect(isValidElement(CurationPage({ blob, s, g, chart: 'data:image/png;base64,A' }))).toBe(true)
  })

  it('EditIntensityPage builds a valid element', () => {
    expect(isValidElement(EditIntensityPage({ blob, s, g, chart: 'data:image/png;base64,A' }))).toBe(true)
  })

  it('RatingsPage builds a valid element', () => {
    expect(isValidElement(RatingsPage({ blob, s, g, chart: 'data:image/png;base64,A' }))).toBe(true)
  })

  it('KeywordsPage builds a valid element', () => {
    expect(isValidElement(KeywordsPage({ blob, s, g, chart: 'data:image/png;base64,A' }))).toBe(true)
  })

  it('BurstsPage builds a valid element', () => {
    expect(isValidElement(BurstsPage({ blob, s, g, chart: 'data:image/png;base64,A' }))).toBe(true)
  })

  it('PeriodComparisonPage builds a valid element', () => {
    expect(isValidElement(PeriodComparisonPage({ s, g }))).toBe(true)
  })

  it('CatalogHealthPage builds a valid element', () => {
    expect(isValidElement(CatalogHealthPage({ blob, s, g }))).toBe(true)
  })
})

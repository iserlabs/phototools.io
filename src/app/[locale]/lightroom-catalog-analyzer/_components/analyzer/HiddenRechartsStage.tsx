'use client'

import { Area, AreaChart, Bar, BarChart, Line, LineChart, FunnelChart, Funnel, RadialBar, RadialBarChart } from 'recharts'
import type { InsightBlob } from '@/lib/lrcat/types'
import { CHART_W, CHART_H } from '../export/pdf/chart-rasterizer-canvas'
import type { useChartPng } from '../export/pdf/chart-rasterizer-recharts'

type PngHook = ReturnType<typeof useChartPng>
type ChartRef = PngHook[1]['ref']
const SIZE = { width: CHART_W, height: CHART_H } as const

export interface RechartsStageRefs {
  yearInReview: ChartRef
  gearBodies: ChartRef
  gearLenses: ChartRef
  focalLengthPerZoom: ChartRef
  apertures: ChartRef
  timeOfDay: ChartRef
  curation: ChartRef
  editIntensity: ChartRef
  ratings: ChartRef
  keywords: ChartRef
  bursts: ChartRef
}

/** Off-screen Recharts charts that the PDF flow rasterizes. Each `refs.<id>`
 *  is a useChartPng() ref attached to the chart so getPng() can capture it. */
export function HiddenRechartsStage({ blob, refs }: { blob: InsightBlob; refs: RechartsStageRefs }) {
  const r = blob.ratings.distribution
  return (
    <>
      <AreaChart {...SIZE} data={blob.yearInReview?.monthlyVolume ?? []} ref={refs.yearInReview}><Area dataKey="count" fill="#f59e0b" stroke="#f59e0b" /></AreaChart>
      <AreaChart {...SIZE} data={blob.gear.bodiesOverTime} ref={refs.gearBodies}><Area dataKey="count" fill="#f59e0b" stroke="#f59e0b" /></AreaChart>
      <BarChart {...SIZE} data={blob.gear.topLenses} ref={refs.gearLenses}><Bar dataKey="count" fill="#f59e0b" /></BarChart>
      <BarChart {...SIZE} data={blob.focalLengthPerZoom.zooms[0]?.histogram ?? []} ref={refs.focalLengthPerZoom}><Bar dataKey="count" fill="#f59e0b" /></BarChart>
      <BarChart {...SIZE} data={blob.apertures.perLens[0]?.histogram ?? []} ref={refs.apertures}><Bar dataKey="count" fill="#f59e0b" /></BarChart>
      <RadialBarChart {...SIZE} data={blob.timeOfDay.byClockHour} ref={refs.timeOfDay}><RadialBar dataKey="count" fill="#f59e0b" /></RadialBarChart>
      <FunnelChart {...SIZE} ref={refs.curation}><Funnel dataKey="value" data={[
        { name: 'Total', value: blob.curation.funnel.total }, { name: 'Not rejected', value: blob.curation.funnel.notRejected },
        { name: '1+', value: blob.curation.funnel.rated1Plus }, { name: '4+', value: blob.curation.funnel.rated4Plus },
      ]} fill="#f59e0b" /></FunnelChart>
      <LineChart {...SIZE} data={blob.editIntensity.scoreByMonth} ref={refs.editIntensity}><Line dataKey="score" stroke="#f59e0b" /></LineChart>
      <BarChart {...SIZE} data={[
        { k: 'Rejected', v: r.rejected }, { k: '0', v: r.r0 }, { k: '1', v: r.r1 }, { k: '2', v: r.r2 }, { k: '3', v: r.r3 }, { k: '4', v: r.r4 }, { k: '5', v: r.r5 },
      ]} ref={refs.ratings}><Bar dataKey="v" fill="#f59e0b" /></BarChart>
      <BarChart {...SIZE} data={blob.keywords.topKeywords} ref={refs.keywords}><Bar dataKey="count" fill="#f59e0b" /></BarChart>
      <BarChart {...SIZE} data={blob.bursts.lengthHistogram} ref={refs.bursts}><Bar dataKey="count" fill="#f59e0b" /></BarChart>
    </>
  )
}

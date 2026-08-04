'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useToolSession } from '@/lib/analytics/hooks/useToolSession'
import { CHEAT_SCENARIOS, getScenario, SCENARIO_IDS } from '@/lib/data/cheatSheet'
import { useQueryInit, useToolQuerySync, strParam } from '@/lib/utils/querySync'
import { LearnPanel } from '@/components/shared/LearnPanel'
import { RelatedTools } from '@/components/shared/RelatedTools'
import { ToolHeading } from '@/components/shared/ToolHeading'
import { ToolActions } from '@/components/shared/ToolActions'
import styles from './CheatSheetTool.module.css'
import { buildCheatSheetCanvas } from './buildCheatSheetCanvas'

const PARAM_SCHEMA = {
  scene: strParam('portrait', SCENARIO_IDS as readonly string[]),
}

function ScenarioGrid({ active, onPick }: { active: string; onPick: (id: string) => void }) {
  const t = useTranslations('toolUI.photography-cheat-sheet')
  return (
    <div className={styles.grid}>
      {CHEAT_SCENARIOS.map((s) => (
        <button
          key={s.id}
          className={`${styles.scenarioBtn} ${s.id === active ? styles.scenarioActive : ''}`}
          onClick={() => onPick(s.id)}
        >
          {t(`scenarios.${s.id}.name`)}
        </button>
      ))}
    </div>
  )
}

export function CheatSheetTool() {
  const t = useTranslations('toolUI.photography-cheat-sheet')
  const { trackParam } = useToolSession()
  const [scene, setScene] = useState('portrait')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useQueryInit(PARAM_SCHEMA, { scene: setScene })
  useToolQuerySync({ scene }, PARAM_SCHEMA)

  const scenario = getScenario(scene)

  const rows = [
    { label: t('labels.aperture'), value: scenario.aperture },
    { label: t('labels.shutter'), value: scenario.shutter },
    { label: t('labels.iso'), value: scenario.iso },
    { label: t('labels.whiteBalance'), value: t(`values.${scenario.whiteBalance}`) },
    { label: t('labels.focusMode'), value: t(`values.${scenario.focusMode}`) },
    { label: t('labels.driveMode'), value: t(`values.${scenario.driveMode}`) },
  ]
  const tips = Array.from({ length: scenario.tipCount }, (_, i) => t(`scenarios.${scenario.id}.tips.${i}`))

  const handleBuildExport = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    buildCheatSheetCanvas(canvas, {
      siteName: 'PhotoTools',
      scenarioName: t(`scenarios.${scenario.id}.name`),
      rows,
      tipsTitle: t('tipsTitle'),
      tips,
    })
    // rows/tips are derived from scenario + t on every render
  }, [scenario, t]) // eslint-disable-line react-hooks/exhaustive-deps

  const onPick = (id: string) => {
    trackParam({ param_name: 'scenario', param_value: id, input_type: 'button' })
    setScene(id)
  }

  return (
    <div className={styles.app}>
      <ToolHeading slug="photography-cheat-sheet" />
      <div className={styles.appBody}>
        <div className={styles.sidebar}>
          <ToolActions
            toolSlug="photography-cheat-sheet"
            canvasRef={canvasRef}
            imageFilename={`cheat-sheet-${scenario.id}.png`}
            onBeforeCopyImage={handleBuildExport}
          />
          <div className={styles.header}>
            <h2 className={styles.title}>{t('pickScenario')}</h2>
          </div>
          <ScenarioGrid active={scene} onPick={onPick} />
        </div>

        <div className={styles.main}>
          <div className={styles.mobileControls}>
            <ScenarioGrid active={scene} onPick={onPick} />
          </div>

          <div className={styles.sheet}>
            <h2 className={styles.sheetTitle}>{t(`scenarios.${scenario.id}.name`)}</h2>
            <dl className={styles.settingsList}>
              {rows.map((row) => (
                <div key={row.label} className={styles.settingRow}>
                  <dt className={styles.settingLabel}>{row.label}</dt>
                  <dd className={styles.settingValue}>{row.value}</dd>
                </div>
              ))}
            </dl>
            <div className={styles.tipsBox}>
              <h3 className={styles.tipsTitle}>{t('tipsTitle')}</h3>
              <ul className={styles.tipsList}>
                {tips.map((tip, i) => (
                  <li key={i} className={styles.tip}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>

          <canvas ref={canvasRef} className={styles.hiddenCanvas} aria-hidden="true" />
        </div>

        <div className={styles.desktopOnly}>
          <LearnPanel slug="photography-cheat-sheet" />
        </div>
      </div>

      <RelatedTools variant="inline" currentSlug="photography-cheat-sheet" />
      <div className={styles.mobileOnly}>
        <LearnPanel slug="photography-cheat-sheet" />
      </div>
    </div>
  )
}

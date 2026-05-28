'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAnalyzer } from '../analyzer/useAnalyzer'
import styles from './DrilldownForm.module.css'
import { NumberRangeField } from './DrilldownNumberRange'
import {
  type FormState,
  RATING_KEYS,
  emptyState,
  filterToFormState,
  formStateToFilter,
  toggleSet,
} from './drilldownFormState'

export function DrilldownForm() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.sections.drilldown')
  const { filter, applyFilter, reset, insightBlob } = useAnalyzer()
  const [form, setForm] = useState<FormState>(() => filterToFormState(filter))

  useEffect(() => { setForm(filterToFormState(filter)) }, [filter])

  // Camera + lens lists from the current insightBlob gear data.
  const cameras = useMemo(() => {
    const seen = new Set<string>()
    for (const row of insightBlob?.gear.bodiesOverTime ?? []) seen.add(row.body)
    return [...seen].sort()
  }, [insightBlob])

  const lenses = useMemo(() => {
    return (insightBlob?.gear.topLenses ?? []).map((l) => l.lens)
  }, [insightBlob])

  function handleApply() {
    void applyFilter(formStateToFilter(form))
  }

  function handleReset() {
    setForm(emptyState())
    reset()
  }

  return (
    <section className={styles.section} aria-labelledby="drilldown-title">
      <h2 id="drilldown-title" className={styles.title}>{t('title')}</h2>
      <p className={styles.description}>{t('description')}</p>

      <div className={styles.grid}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('dateRange')}</span>
          <div className={styles.rangeRow}>
            <input
              aria-label={t('dateStart')}
              className={styles.dateInput}
              type="date"
              value={form.dateStart}
              onChange={(e) => setForm({ ...form, dateStart: e.target.value })}
            />
            <input
              aria-label={t('dateEnd')}
              className={styles.dateInput}
              type="date"
              value={form.dateEnd}
              onChange={(e) => setForm({ ...form, dateEnd: e.target.value })}
            />
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('cameras')}</span>
          <div className={styles.checkList} role="group" aria-label={t('cameras')}>
            {cameras.map((c) => (
              <label key={c} className={styles.checkRow}>
                <input
                  type="checkbox"
                  aria-label={c}
                  checked={form.cameras.has(c)}
                  onChange={() => setForm({ ...form, cameras: toggleSet(form.cameras, c) })}
                />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('lenses')}</span>
          <div className={styles.checkList} role="group" aria-label={t('lenses')}>
            {lenses.map((l) => (
              <label key={l} className={styles.checkRow}>
                <input
                  type="checkbox"
                  aria-label={l}
                  checked={form.lenses.has(l)}
                  onChange={() => setForm({ ...form, lenses: toggleSet(form.lenses, l) })}
                />
                <span>{l}</span>
              </label>
            ))}
          </div>
        </div>

        <NumberRangeField
          label={t('focalLength')}
          minAriaLabel={t('focalLengthMin')}
          maxAriaLabel={t('focalLengthMax')}
          min={8}
          max={800}
          minValue={form.focalMin}
          maxValue={form.focalMax}
          onMin={(v) => setForm({ ...form, focalMin: v })}
          onMax={(v) => setForm({ ...form, focalMax: v })}
        />

        <NumberRangeField
          label={t('aperture')}
          minAriaLabel={t('apertureMin')}
          maxAriaLabel={t('apertureMax')}
          min={1}
          max={32}
          step={0.1}
          minValue={form.apertureMin}
          maxValue={form.apertureMax}
          onMin={(v) => setForm({ ...form, apertureMin: v })}
          onMax={(v) => setForm({ ...form, apertureMax: v })}
        />

        <NumberRangeField
          label={t('iso')}
          minAriaLabel={t('isoMin')}
          maxAriaLabel={t('isoMax')}
          min={50}
          max={409600}
          minValue={form.isoMin}
          maxValue={form.isoMax}
          onMin={(v) => setForm({ ...form, isoMin: v })}
          onMax={(v) => setForm({ ...form, isoMax: v })}
        />

        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('ratings')}</span>
          <div className={styles.ratingRow} role="group" aria-label={t('ratings')}>
            {[0, 1, 2, 3, 4, 5].map((r) => (
              <label key={r} className={styles.checkRow}>
                <input
                  type="checkbox"
                  aria-label={t(RATING_KEYS[r])}
                  checked={form.ratings.has(r)}
                  onChange={() => setForm({ ...form, ratings: toggleSet(form.ratings, r) })}
                />
                <span>{r}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>{t('pickState')}</span>
          <div className={styles.radioRow} role="radiogroup" aria-label={t('pickState')}>
            {(['', 'pick', 'reject', 'none'] as const).map((p) => {
              const labelKey = p === '' ? 'pickAny' : p === 'pick' ? 'pickFlagged' : p === 'reject' ? 'pickRejected' : 'pickNone'
              return (
                <label key={p || 'any'} className={styles.checkRow}>
                  <input
                    type="radio"
                    name="pick"
                    aria-label={t(labelKey)}
                    checked={form.pick === p}
                    onChange={() => setForm({ ...form, pick: p })}
                  />
                  <span>{t(labelKey)}</span>
                </label>
              )
            })}
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.applyButton} onClick={handleApply}>{t('apply')}</button>
        <button type="button" className={styles.resetButton} onClick={handleReset}>{t('reset')}</button>
      </div>
    </section>
  )
}

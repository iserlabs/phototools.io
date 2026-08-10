'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import styles from './SearchCombobox.module.css'

interface SearchComboboxProps<T extends { id: string }> {
  items: T[]
  groupBy(item: T): string
  label(item: T): string
  value: string | null
  onChange(id: string | null): void
  placeholder: string
  clearLabel: string
}

/**
 * Generic, provider-free search combobox: text-filters `items` by `label()`
 * case-insensitively, groups results by `groupBy()`, and exposes standard
 * listbox a11y (role=combobox/listbox/option, aria-expanded, arrow keys,
 * Enter to commit). Consumed by CameraPanel (cameras grouped by brand) and
 * LensPanel (lenses grouped by brand).
 */
export function SearchCombobox<T extends { id: string }>({
  items, groupBy, label, value, onChange, placeholder, clearLabel,
}: SearchComboboxProps<T>) {
  const listboxId = useId()
  const selected = useMemo(() => items.find((i) => i.id === value) ?? null, [items, value])

  const [query, setQuery] = useState(selected ? label(selected) : '')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)

  // Keep the input text in sync with an externally-changed `value` while closed.
  useEffect(() => {
    if (!open) setQuery(selected ? label(selected) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter((i) => label(i).toLowerCase().includes(q)) : items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query])

  // Carries each item's flat index into `filtered` alongside it, so rendering
  // below can key highlight/aria-activedescendant off that index directly
  // instead of an O(n) `filtered.indexOf(item)` per option (was O(n²) overall
  // across the full listbox render).
  const groups = useMemo(() => {
    const map = new Map<string, { item: T; idx: number }[]>()
    filtered.forEach((item, idx) => {
      const g = groupBy(item)
      const bucket = map.get(g)
      if (bucket) bucket.push({ item, idx })
      else map.set(g, [{ item, idx }])
    })
    return [...map.entries()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered])

  const optionId = (idx: number) => `${listboxId}-opt-${idx}`

  function selectItem(item: T) {
    onChange(item.id)
    setQuery(label(item))
    setOpen(false)
    setHighlight(-1)
  }

  function handleClear() {
    onChange(null)
    setQuery('')
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && highlight >= 0 && filtered[highlight]) {
        e.preventDefault()
        selectItem(filtered[highlight])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.inputRow}>
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && highlight >= 0 ? optionId(highlight) : undefined}
          className={styles.input}
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setHighlight(-1)
          }}
          onKeyDown={handleKeyDown}
        />
        {selected && (
          <button type="button" className={styles.clearBtn} onClick={handleClear}>
            {clearLabel}
          </button>
        )}
      </div>
      {open && (
        <div role="listbox" id={listboxId} className={styles.listbox}>
          {groups.map(([group, groupItems]) => (
            <div key={group} className={styles.group}>
              <div className={styles.groupLabel}>{group}</div>
              {groupItems.map(({ item, idx }) => (
                <div
                  key={item.id}
                  id={optionId(idx)}
                  role="option"
                  aria-selected={item.id === value}
                  className={`${styles.option} ${idx === highlight ? styles.optionHighlighted : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => selectItem(item)}
                >
                  {label(item)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

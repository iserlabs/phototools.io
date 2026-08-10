import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { loadRows, persistRows, SAVED_KEY, SAVED_CAP } from './savedSettingsStore'
import { useSavedSettings } from './useSavedSettings'

function memStorage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init))
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      m.set(k, v)
    },
    dump: () => m,
  }
}

describe('savedSettingsStore', () => {
  it('round-trips rows', () => {
    const s = memStorage()
    const rows = [{ id: 'a', cameraLabel: 'Full Frame', focalLength: 85, aperture: 1.4, distanceM: 3, bokeh: 'disc' as const }]
    expect(persistRows(s, rows)).toBe(true)
    expect(loadRows(s)).toEqual(rows)
  })
  it('returns [] for corrupt or wrong-version payloads', () => {
    expect(loadRows(memStorage({ [SAVED_KEY]: 'not json' }))).toEqual([])
    expect(loadRows(memStorage({ [SAVED_KEY]: JSON.stringify({ v: 99, rows: [{}] }) }))).toEqual([])
  })
  it('reports persistence failure instead of throwing', () => {
    const bad = {
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(persistRows(bad, [])).toBe(false)
  })
})

describe('useSavedSettings hook', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('rows are empty initially', () => {
    const { result } = renderHook(() => useSavedSettings())
    expect(result.current.rows).toEqual([])
  })

  it('addRow prepends and caps at SAVED_CAP', async () => {
    const { result } = renderHook(() => useSavedSettings())
    await act(async () => {})

    for (let i = 0; i < 21; i++) {
      act(() => {
        result.current.addRow({ cameraLabel: `Camera ${i}`, focalLength: i, aperture: 2.8, distanceM: 3, bokeh: 'disc' })
      })
    }

    expect(result.current.rows.length).toBe(SAVED_CAP)
    // newest first: the 21st add (index 20) should be at the front, and the
    // oldest (index 0) should have been dropped by the cap.
    expect(result.current.rows[0].cameraLabel).toBe('Camera 20')
    expect(result.current.rows.some((r) => r.cameraLabel === 'Camera 0')).toBe(false)
  })

  it('removeRow removes by id', async () => {
    const { result } = renderHook(() => useSavedSettings())
    await act(async () => {})

    act(() => {
      result.current.addRow({ cameraLabel: 'A', focalLength: 50, aperture: 2.8, distanceM: 3, bokeh: 'disc' })
    })
    const id = result.current.rows[0].id

    act(() => {
      result.current.removeRow(id)
    })

    expect(result.current.rows).toEqual([])
  })

  it("sortBy('focalLength') sorts ascending", async () => {
    const { result } = renderHook(() => useSavedSettings())
    await act(async () => {})

    act(() => {
      result.current.addRow({ cameraLabel: 'A', focalLength: 85, aperture: 2.8, distanceM: 3, bokeh: 'disc' })
    })
    act(() => {
      result.current.addRow({ cameraLabel: 'B', focalLength: 24, aperture: 2.8, distanceM: 3, bokeh: 'disc' })
    })
    act(() => {
      result.current.addRow({ cameraLabel: 'C', focalLength: 50, aperture: 2.8, distanceM: 3, bokeh: 'disc' })
    })

    act(() => {
      result.current.sortBy('focalLength')
    })

    expect(result.current.rows.map((r) => r.focalLength)).toEqual([24, 50, 85])
  })

  it('rows survive a remount (persistence roundtrip)', async () => {
    const { result, unmount } = renderHook(() => useSavedSettings())
    await act(async () => {})

    act(() => {
      result.current.addRow({ cameraLabel: 'Persisted', focalLength: 50, aperture: 1.8, distanceM: 2, bokeh: 'disc' })
    })
    // flush the persistence effect
    await act(async () => {})
    unmount()

    const { result: result2 } = renderHook(() => useSavedSettings())
    await act(async () => {})

    expect(result2.current.rows.length).toBe(1)
    expect(result2.current.rows[0].cameraLabel).toBe('Persisted')
  })
})

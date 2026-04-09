'use client'

import { useTranslations } from 'next-intl'
import type { Editor } from '@tiptap/react'
import type { TextBlockConfig } from './types'
import { FONT_OPTIONS, SHADOW_PRESETS } from './types'
import s from './TextToolbar.module.css'

interface TextToolbarProps {
  overlays: TextBlockConfig[]
  activeId: string | null
  onAdd: () => void
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<TextBlockConfig>) => void
  editor: Editor | null
}

const ALIGNS = ['left', 'center', 'right'] as const
const ALIGN_ICONS: Record<string, string> = { left: '⫷', center: '☰', right: '⫸' }

export function TextToolbar({ overlays, activeId, onAdd, onRemove, onUpdate, editor }: TextToolbarProps) {
  const t = useTranslations('toolUI.frame-studio')
  const active = overlays.find((o) => o.id === activeId)
  const set = (u: Partial<TextBlockConfig>) => active && onUpdate(active.id, u)
  const tog = (cls: string, isOn: boolean) =>
    `${s.toggleBtn} ${cls} ${isOn ? s.active : ''}`

  return (
    <div className={s.panel}>
      <div className={s.actions}>
        <button className={s.addBtn} onClick={onAdd}>{t('addText')}</button>
        <button className={s.removeBtn} disabled={!activeId}
          onClick={() => activeId && onRemove(activeId)}>{t('removeText')}</button>
      </div>

      {!active && (
        <p className={s.hint}>
          {overlays.length === 0 ? t('addTextHint') : t('selectTextHint')}
        </p>
      )}

      {active && (
        <>
          {/* Font family */}
          <div className={s.field}>
            <span className={s.fieldLabel}>{t('font')}</span>
            <select className={s.select} value={active.fontFamily}
              onChange={(e) => set({ fontFamily: e.target.value })}>
              {FONT_OPTIONS.map((f) => (
                <option key={f.id} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Font size */}
          <div className={s.field}>
            <span className={s.fieldLabel}>{t('fontSize')}</span>
            <input className={s.slider} type="range" min={10} max={72} step={1}
              value={active.fontSize} onChange={(e) => set({ fontSize: Number(e.target.value) })} />
            <span className={s.fieldValue}>{active.fontSize}px</span>
          </div>

          {/* Color */}
          <div className={s.field}>
            <span className={s.fieldLabel}>{t('textColor')}</span>
            <input className={s.colorInput} type="color" value={active.color}
              onChange={(e) => set({ color: e.target.value })} />
          </div>

          {/* Opacity */}
          <div className={s.field}>
            <span className={s.fieldLabel}>{t('textOpacity')}</span>
            <input className={s.slider} type="range" min={0.1} max={1} step={0.05}
              value={active.opacity} onChange={(e) => set({ opacity: Number(e.target.value) })} />
            <span className={s.fieldValue}>{Math.round(active.opacity * 100)}%</span>
          </div>

          {/* Shadow */}
          <div className={s.field}>
            <span className={s.fieldLabel}>{t('textShadow')}</span>
            <select className={s.select} value={active.textShadow}
              onChange={(e) => set({ textShadow: e.target.value })}>
              {SHADOW_PRESETS.map((p) => (
                <option key={p.id} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Bold / Italic */}
          <div className={s.field}>
            <span className={s.fieldLabel}>{t('textStyle')}</span>
            <div className={s.row}>
              <button className={tog(s.bold, !!editor?.isActive('bold'))}
                onClick={() => editor?.chain().focus().toggleBold().run()}>B</button>
              <button className={tog(s.italic, !!editor?.isActive('italic'))}
                onClick={() => editor?.chain().focus().toggleItalic().run()}>I</button>
            </div>
          </div>

          {/* Alignment */}
          <div className={s.field}>
            <span className={s.fieldLabel}>{t('textAlign')}</span>
            <div className={s.row}>
              {ALIGNS.map((a) => (
                <button key={a} className={tog('', active.textAlign === a)}
                  onClick={() => set({ textAlign: a })}>{ALIGN_ICONS[a]}</button>
              ))}
            </div>
          </div>

          {/* Letter spacing */}
          <div className={s.field}>
            <span className={s.fieldLabel}>{t('letterSpacing')}</span>
            <input className={s.slider} type="range" min={-2} max={10} step={0.5}
              value={active.letterSpacing}
              onChange={(e) => set({ letterSpacing: Number(e.target.value) })} />
            <span className={s.fieldValue}>{active.letterSpacing}px</span>
          </div>
        </>
      )}
    </div>
  )
}

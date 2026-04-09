'use client'

import { forwardRef, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import type { TextBlockConfig } from './types'
import styles from './RichTextBlock.module.css'

interface RichTextBlockProps {
  config: TextBlockConfig
  isActive: boolean
  onSelect: (id: string) => void
  onContentChange: (id: string, html: string) => void
}

export const RichTextBlock = forwardRef<HTMLDivElement, RichTextBlockProps>(
  function RichTextBlock({ config, isActive, onSelect, onContentChange }, ref) {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          blockquote: false,
          horizontalRule: false,
        }),
        TextStyle,
        Color,
        TextAlign.configure({ types: ['paragraph'] }),
        Placeholder.configure({ placeholder: 'Type here…' }),
      ],
      editorProps: {
        attributes: { class: styles.editor },
      },
      onUpdate: ({ editor: e }) => {
        onContentChange(config.id, e.getHTML())
      },
    })

    useEffect(() => {
      if (editor && !editor.isDestroyed) {
        editor.chain().selectAll().setTextAlign(config.textAlign).run()
      }
    }, [editor, config.textAlign])

    return (
      <div
        ref={ref}
        className={`${styles.block} ${isActive ? styles.active : ''}`}
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          transform: 'translate(-50%, -50%)',
          fontFamily: config.fontFamily,
          fontSize: `${config.fontSize}px`,
          color: config.color,
          opacity: config.opacity,
          textShadow:
            config.textShadow === 'none' ? undefined : config.textShadow,
          letterSpacing: config.letterSpacing
            ? `${config.letterSpacing}px`
            : undefined,
          maxWidth: `${config.maxWidth}%`,
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
          onSelect(config.id)
        }}
      >
        <EditorContent editor={editor} />
      </div>
    )
  },
)

'use client'

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { trackContactFormSubmit } from '@/lib/analytics'
import styles from './ContactForm.module.css'

export function ContactForm() {
  const t = useTranslations('contact.form')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSending(true)

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        trackContactFormSubmit()
        toast.success(t('successToast'))
        setSent(true)
        form.reset()
      } else {
        const body = await res.json()
        toast.error(body.error || t('errorToast'))
      }
    } catch {
      toast.error(t('networkErrorToast'))
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className={styles.sent} role="status" aria-live="polite">
        <p className={styles.sentTitle}>{t('sentTitle')}</p>
        <p className={styles.sentMessage}>{t('sentMessage')}</p>
        <button type="button" onClick={() => setSent(false)} className={styles.sendAnother}>
          {t('sendAnother')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} data-ph-no-capture>
      {/* Honeypot — hidden from humans and screen readers */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="website">{t('honeypotLabel')}</label>
        <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={styles.field}>
        <label htmlFor="name" className={styles.label}>{t('nameLabel')}</label>
        <input
          type="text"
          id="name"
          name="name"
          required
          maxLength={100}
          className={styles.input}
          placeholder={t('namePlaceholder')}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="email" className={styles.label}>{t('emailLabel')}</label>
        <input
          type="email"
          id="email"
          name="email"
          required
          className={styles.input}
          placeholder={t('emailPlaceholder')}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="subject" className={styles.label}>{t('subjectLabel')}</label>
        <input
          type="text"
          id="subject"
          name="subject"
          required
          maxLength={200}
          className={styles.input}
          placeholder={t('subjectPlaceholder')}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="category" className={styles.label}>{t('categoryLabel')}</label>
        <select
          id="category"
          name="category"
          required
          className={styles.select}
          defaultValue=""
        >
          <option value="" disabled>{t('categoryPlaceholder')}</option>
          <option value="tool-feedback">{t('categoryToolFeedback')}</option>
          <option value="bug-report">{t('categoryBugReport')}</option>
          <option value="new-tool-suggestion">{t('categoryNewToolSuggestion')}</option>
          <option value="translation-issue">{t('categoryTranslationIssue')}</option>
          <option value="other">{t('categoryOther')}</option>
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="message" className={styles.label}>{t('messageLabel')}</label>
        <textarea
          id="message"
          name="message"
          required
          maxLength={5000}
          className={styles.textarea}
          placeholder={t('messagePlaceholder')}
          rows={6}
        />
      </div>

      <button type="submit" disabled={sending} className={styles.submit}>
        {sending ? t('sending') : t('submit')}
      </button>
    </form>
  )
}

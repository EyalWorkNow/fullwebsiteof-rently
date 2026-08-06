'use client'

// The live publishing draft, rendered inside the conversation under עזרא's most
// recent draft turn. Controlled by the workspace: every keystroke marks the field
// dirty there, so a later assistant draft can refine the untouched fields without
// ever undoing what the landlord typed.

import Link from 'next/link'
import { useState } from 'react'
import { Edit2, TickCircle } from 'iconsax-react'
import { currentUser } from '@/lib/live/firebase'
import { useAuthGate } from '@/components/keyz/auth/AuthGate'
import { CONDITIONS, publishDraft, type DraftKey, type EzraDraftFields } from './ezra-api'

const PUBLISH_REASON = 'כדי לפרסם דירה ולנהל אותה'

export default function DraftCard({
  fields,
  dirty,
  publishedId,
  onEdit,
  onPublished,
}: {
  fields: EzraDraftFields
  dirty: DraftKey[]
  publishedId?: string
  onEdit: (key: DraftKey, value: string) => void
  onPublished: (id: string) => void
}) {
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { requireAuth } = useAuthGate()

  async function publish() {
    if (publishing) return
    // Read the account at publish time — after a gate sign-in this is the fresh
    // (non-anonymous) user, whose uid must own the listing.
    const u = currentUser()
    if (!u || u.isAnonymous) {
      setError('צריך להתחבר כדי לפרסם דירה.')
      return
    }
    setPublishing(true)
    setError(null)
    try {
      const { id } = await publishDraft(fields, u.uid, u.displayName ?? '')
      onPublished(id)
    } catch (e) {
      setError((e as Error).message || 'הפרסום נכשל. נסו שוב.')
    } finally {
      setPublishing(false)
    }
  }

  if (publishedId) {
    return (
      <div className="mt-3 ms-11 max-w-[620px] rounded-[28px] border border-success/40 bg-[#F0FBF5] p-5 card-shadow">
        <div className="flex items-center gap-2 font-black text-success">
          <TickCircle size={20} variant="Bold" color="currentColor" />
          הדירה פורסמה! היא מופיעה גם באפליקציה
        </div>
        <p className="mt-1.5 text-[13px] font-semibold text-secondary-text">
          {fields.city}
          {fields.streetLine ? ` · ${fields.streetLine}` : ''}
          {fields.price ? ` · ${Number(fields.price).toLocaleString('he-IL')} ₪` : ''}
        </p>
        <Link
          href={`/listing/${publishedId}`}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-success px-5 py-2.5 text-[13.5px] font-bold text-white transition-opacity hover:opacity-90"
        >
          לצפייה בדירה
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-3 ms-11 max-w-[620px] rounded-[28px] border border-primary/30 bg-white p-5 card-shadow">
      <div className="mb-1 flex items-center gap-2 font-black text-navy">
        <Edit2 size={18} color="currentColor" className="text-primary" />
        טיוטת המודעה — מתעדכנת תוך כדי השיחה
      </div>
      <p className="mb-4 text-[12px] font-semibold text-secondary-text">
        אפשר לערוך כל שדה. מה שתערכו — עזרא לא ידרוס בהמשך השיחה.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="עיר" value={fields.city} dirty={dirty.includes('city')} onChange={(v) => onEdit('city', v)} />
        <Field
          label="רחוב ומספר"
          value={fields.streetLine}
          dirty={dirty.includes('streetLine')}
          onChange={(v) => onEdit('streetLine', v)}
        />
        <Field
          label="חדרים"
          value={fields.rooms}
          inputMode="decimal"
          dirty={dirty.includes('rooms')}
          onChange={(v) => onEdit('rooms', v)}
        />
        <Field
          label='מ"ר'
          value={fields.sizeM2}
          inputMode="numeric"
          dirty={dirty.includes('sizeM2')}
          onChange={(v) => onEdit('sizeM2', v)}
        />
        <Field label="קומה" value={fields.floor} dirty={dirty.includes('floor')} onChange={(v) => onEdit('floor', v)} />
        <Field
          label="מחיר (₪)"
          value={fields.price}
          inputMode="numeric"
          dirty={dirty.includes('price')}
          onChange={(v) => onEdit('price', v.replace(/[^\d]/g, ''))}
        />
        <Select
          label="סוג עסקה"
          value={fields.transactionType}
          dirty={dirty.includes('transactionType')}
          options={[
            { value: 'rent', label: 'השכרה' },
            { value: 'sale', label: 'מכירה' },
          ]}
          onChange={(v) => onEdit('transactionType', v)}
        />
        <Select
          label="מצב הנכס"
          value={fields.condition}
          dirty={dirty.includes('condition')}
          options={CONDITIONS.map((c) => ({ value: c, label: c }))}
          onChange={(v) => onEdit('condition', v)}
        />
      </div>

      <label className="mt-3 flex flex-col gap-1 text-xs font-bold text-secondary-text">
        <span className="flex items-center gap-1.5">
          תיאור
          {dirty.includes('description') && <DirtyDot />}
        </span>
        <textarea
          value={fields.description}
          onChange={(e) => onEdit('description', e.target.value)}
          rows={3}
          className="resize-y rounded-xl border border-border-app px-3 py-2 text-sm text-navy outline-none focus:border-primary"
        />
      </label>

      {error && <p className="mt-3 text-[13px] font-bold text-coral">{error}</p>}

      <button
        type="button"
        onClick={() => requireAuth(PUBLISH_REASON, () => void publish())}
        disabled={publishing}
        className="mt-4 w-full rounded-full bg-primary py-3 font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
      >
        {publishing ? 'מפרסמים…' : 'פרסום הדירה'}
      </button>
    </div>
  )
}

function DirtyDot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-primary" title="נערך על ידך" aria-hidden />
}

function Field({
  label,
  value,
  onChange,
  inputMode,
  dirty,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  inputMode?: 'numeric' | 'decimal'
  dirty?: boolean
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-secondary-text">
      <span className="flex items-center gap-1.5">
        {label}
        {dirty && <DirtyDot />}
      </span>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 rounded-xl border border-border-app px-3 py-2 text-sm text-navy outline-none focus:border-primary"
      />
    </label>
  )
}

function Select({
  label,
  value,
  options,
  onChange,
  dirty,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  dirty?: boolean
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-secondary-text">
      <span className="flex items-center gap-1.5">
        {label}
        {dirty && <DirtyDot />}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-border-app bg-white px-3 py-2 text-sm text-navy outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

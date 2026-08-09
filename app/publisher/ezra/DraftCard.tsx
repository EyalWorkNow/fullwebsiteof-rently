'use client'

// The live publishing draft, rendered inside the conversation under עזרא's most
// recent draft turn. Controlled by the workspace: every keystroke marks the field
// dirty there, so a later assistant draft can refine the untouched fields without
// ever undoing what the landlord typed.
//
// Styled as an editable PREVIEW of the real listing card (same media-block +
// chip-row + address layout as components/keyz/PropertyCard.tsx) rather than a
// generic form — what you see here is close to what a tenant will see.
//
// IMPORTANT: this card stays editable even after a successful save. The old
// version swapped to a permanent read-only "published!" screen on first save,
// which meant a second edit (e.g. adding one more photo) had nowhere to go —
// that was the "can't save changes after uploading a photo" bug. Now a
// successful save just shows an inline confirmation strip; the form underneath
// never disappears, so the landlord can keep tweaking and re-saving.
//
// A photo is REQUIRED before publish is allowed — a listing nobody can see a
// picture of doesn't get published. Editing an existing listing pre-loads its
// current photos, so an edit that doesn't touch photos still satisfies the gate.

import { useState } from 'react'
import Link from 'next/link'
import { AddCircle, Building, CloseCircle, Eye, TickCircle } from 'iconsax-react'
import { currentUser } from '@/lib/live/firebase'
import { useAuthGate } from '@/components/keyz/auth/AuthGate'
import {
  CONDITIONS,
  publishDraft,
  uploadPhoto,
  type DraftKey,
  type ExistingProperty,
  type EzraDraftFields,
} from './ezra-api'

const PUBLISH_REASON = 'כדי לפרסם דירה ולנהל אותה'
const PHOTO_REASON = 'כדי להעלות תמונות ולפרסם דירה'

interface PendingUpload {
  id: string
  previewUrl: string
  status: 'uploading' | 'error'
  error?: string
}

export default function DraftCard({
  fields,
  dirty,
  photos,
  onPhotosChange,
  publishedId,
  isEditing,
  existing,
  onEdit,
  onPublished,
}: {
  fields: EzraDraftFields
  dirty: DraftKey[]
  photos: string[]
  onPhotosChange: (photos: string[]) => void
  publishedId?: string
  /** true when this draft is editing a listing that already exists. */
  isEditing?: boolean
  /** the full existing row — round-tripped on publish so untouched fields survive. */
  existing?: ExistingProperty
  onEdit: (key: DraftKey, value: string) => void
  onPublished: (id: string) => void
}) {
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [pending, setPending] = useState<PendingUpload[]>([])
  const { requireAuth } = useAuthGate()

  // Uploads run one at a time so each `onPhotosChange` call reads the photos
  // array as it stood after the PREVIOUS upload landed — a Promise.all here
  // would let every upload close over the same stale `photos` snapshot and
  // the slowest one to resolve would silently wipe out all the others.
  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList)
    const entries: PendingUpload[] = files.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      previewUrl: URL.createObjectURL(f),
      status: 'uploading',
    }))
    setPending((p) => [...p, ...entries])

    let currentPhotos = [...photos]

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const entry = entries[i]
      try {
        const url = await uploadPhoto(file)
        currentPhotos = [...currentPhotos, url]
        onPhotosChange(currentPhotos)
        setPending((p) => p.filter((x) => x.id !== entry.id))
        URL.revokeObjectURL(entry.previewUrl)
      } catch (e) {
        setPending((p) =>
          p.map((x) => (x.id === entry.id ? { ...x, status: 'error', error: (e as Error).message } : x)),
        )
      }
    }
  }

  function addPhotos() {
    requireAuth(PHOTO_REASON, () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.multiple = true
      input.onchange = () => {
        void handleFiles(input.files)
      }
      input.click()
    })
  }

  function removePhoto(url: string) {
    onPhotosChange(photos.filter((p) => p !== url))
  }

  function removePending(id: string) {
    setPending((p) => p.filter((x) => x.id !== id))
  }

  const uploading = pending.some((p) => p.status === 'uploading')

  async function publish() {
    if (publishing) return
    const u = currentUser()
    if (!u || u.isAnonymous) {
      setError('צריך להתחבר כדי לפרסם דירה.')
      return
    }
    if (photos.length === 0) {
      setError('יש להעלות לפחות תמונה אחת של הדירה כדי לפרסם.')
      return
    }
    if (!fields.city || !fields.city.trim()) {
      setError('יש למלא עיר בטיוטה כדי לפרסם את הדירה.')
      return
    }
    if (!fields.price || parseInt(fields.price, 10) <= 0) {
      setError('יש למלא מחיר תקין בטיוטה כדי לפרסם את הדירה.')
      return
    }
    setPublishing(true)
    setError(null)
    setJustSaved(false)
    try {
      const { id } = await publishDraft(fields, u.uid, u.displayName ?? '', photos, existing)
      onPublished(id)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 4000)
    } catch (e) {
      setError((e as Error).message || 'הפרסום נכשל. נסו שוב.')
    } finally {
      setPublishing(false)
    }
  }

  const canPublish = photos.length > 0 && !uploading
  const hero = photos[0]

  return (
    <div className="mt-3 ms-11 max-w-[420px] overflow-hidden rounded-[28px] border border-primary/30 bg-white card-shadow">
      {/* ── Media block — same 4px inset / 22px inner radius as PropertyCard ── */}
      <div className="p-1">
        <div className="relative aspect-[2.1] overflow-hidden rounded-[22px] bg-primary-light2">
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-primary">
              <Building size={40} color="#2563EB" />
              <span className="text-[11.5px] font-bold">אין עדיין תמונה</span>
            </div>
          )}
          <span
            className={`absolute top-2.5 start-2.5 rounded-full px-3 py-1 text-[11px] font-extrabold badge-shadow ${
              publishedId ? 'bg-success/90 text-white' : 'bg-white/90 text-secondary-text'
            }`}
          >
            {publishedId ? 'פורסם' : 'טיוטה'}
          </span>
          {publishedId && (
            <Link
              href={`/listing/${publishedId}`}
              className="absolute top-2.5 end-2.5 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white badge-shadow transition hover:text-primary"
              aria-label="לצפייה בדירה"
            >
              <Eye size={15} color="#072946" />
            </Link>
          )}
        </div>
      </div>

      {/* ── Photo strip — every photo removable, always-open add button ── */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-3.5 pt-2">
        {photos.map((url) => (
          <div key={url} className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border-app">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(url)}
              aria-label="הסרת תמונה"
              className="absolute end-0.5 top-0.5 rounded-full bg-navy/70 p-1 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            >
              <CloseCircle size={14} color="currentColor" />
            </button>
          </div>
        ))}
        {pending.map((p) => (
          <div key={p.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border-app">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.previewUrl} alt="" className="h-full w-full object-cover opacity-50" />
            {p.status === 'uploading' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => removePending(p.id)}
                title={p.error}
                className="absolute inset-0 flex items-center justify-center bg-[#FFF2F2]/90 text-coral"
              >
                <CloseCircle size={18} color="currentColor" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addPhotos}
          className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-border-app text-secondary-text transition hover:border-primary hover:text-primary"
        >
          <AddCircle size={18} color="currentColor" />
          <span className="text-[10px] font-bold">תמונה</span>
        </button>
      </div>
      {photos.length === 0 && pending.length === 0 && (
        <p className="px-3.5 pt-1.5 text-[11.5px] font-bold text-coral">חובה להעלות לפחות תמונה אחת כדי לפרסם</p>
      )}

      {/* ── Row 1 — editable price, like the listing's own price row ── */}
      <div className="flex items-center gap-2 px-3.5 pt-3">
        <span className="text-[15px] font-black text-secondary-text">₪</span>
        <input
          value={fields.price}
          inputMode="numeric"
          placeholder="מחיר"
          onChange={(e) => onEdit('price', e.target.value.replace(/[^\d]/g, ''))}
          className="w-full min-w-0 border-0 bg-transparent text-[19px] font-black text-navy outline-none placeholder:text-secondary-text/60"
        />
        {dirty.includes('price') && <DirtyDot />}
      </div>

      {/* ── Row 2 — rooms / size / floor / transaction / condition, chip-styled ── */}
      <div className="no-scrollbar mt-2 flex flex-row gap-1.5 overflow-x-auto px-3.5">
        <ChipInput
          value={fields.rooms}
          onChange={(v) => onEdit('rooms', v)}
          suffix="חדרים"
          inputMode="decimal"
          dirty={dirty.includes('rooms')}
          width="w-10"
        />
        <ChipInput
          value={fields.sizeM2}
          onChange={(v) => onEdit('sizeM2', v)}
          suffix='מ״ר'
          inputMode="numeric"
          dirty={dirty.includes('sizeM2')}
          width="w-10"
        />
        <ChipInput
          value={fields.floor}
          onChange={(v) => onEdit('floor', v)}
          suffix="קומה"
          dirty={dirty.includes('floor')}
          width="w-8"
        />
        <ChipSelect
          value={fields.transactionType}
          onChange={(v) => onEdit('transactionType', v)}
          dirty={dirty.includes('transactionType')}
          options={[
            { value: 'rent', label: 'השכרה' },
            { value: 'sale', label: 'מכירה' },
          ]}
        />
        <ChipSelect
          value={fields.condition}
          onChange={(v) => onEdit('condition', v)}
          dirty={dirty.includes('condition')}
          options={CONDITIONS.map((c) => ({ value: c, label: c }))}
        />
      </div>

      {/* ── Row 3 — city + street, like the listing's address line ── */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 px-3.5">
        <input
          value={fields.streetLine}
          placeholder="רחוב ומספר"
          onChange={(e) => onEdit('streetLine', e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-black text-navy outline-none placeholder:text-secondary-text/60"
        />
        {dirty.includes('streetLine') && <DirtyDot />}
        <span className="text-[12px] font-semibold text-secondary-text">·</span>
        <input
          value={fields.city}
          placeholder="עיר"
          onChange={(e) => onEdit('city', e.target.value)}
          className="w-24 min-w-0 border-0 bg-transparent text-[12px] font-semibold text-secondary-text outline-none placeholder:text-secondary-text/60"
        />
        {dirty.includes('city') && <DirtyDot />}
      </div>

      {/* ── Description ── */}
      <label className="mt-3 flex flex-col gap-1 px-3.5 text-xs font-bold text-secondary-text">
        <span className="flex items-center gap-1.5">
          תיאור
          {dirty.includes('description') && <DirtyDot />}
        </span>
        <textarea
          value={fields.description}
          placeholder="כמה מילים על הדירה — למה כדאי לגור בה"
          onChange={(e) => onEdit('description', e.target.value)}
          rows={3}
          className="resize-y rounded-xl border border-border-app px-3 py-2 text-sm font-normal text-navy outline-none focus:border-primary"
        />
      </label>

      <div className="p-3.5 pt-3">
        {error && <p className="mb-2 text-[13px] font-bold text-coral">{error}</p>}
        {justSaved && !error && (
          <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-success">
            <TickCircle size={16} variant="Bold" color="currentColor" />
            {isEditing ? 'השינויים נשמרו' : 'הדירה פורסמה'} — מופיע גם באפליקציה
          </div>
        )}
        <button
          type="button"
          onClick={() => requireAuth(PUBLISH_REASON, () => void publish())}
          disabled={publishing || !canPublish}
          title={!canPublish ? (uploading ? 'ממתינים לסיום העלאת התמונה' : 'יש להעלות לפחות תמונה אחת') : undefined}
          className="w-full rounded-full bg-primary py-3 font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {publishing
            ? 'שומרים…'
            : uploading
              ? 'מעלים תמונה…'
              : publishedId
                ? 'שמירת שינוי נוסף'
                : 'פרסום הדירה'}
        </button>
      </div>
    </div>
  )
}

function DirtyDot() {
  return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" title="נערך על ידך" aria-hidden />
}

function ChipInput({
  value,
  onChange,
  suffix,
  inputMode,
  dirty,
  width,
}: {
  value: string
  onChange: (v: string) => void
  suffix: string
  inputMode?: 'numeric' | 'decimal'
  dirty?: boolean
  width: string
}) {
  return (
    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[10px] bg-[#F1F5F9] px-2.5 py-1.5 text-[11.5px] font-bold text-navy">
      <input
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className={`${width} border-0 bg-transparent text-[11.5px] font-bold text-navy outline-none`}
      />
      {suffix}
      {dirty && <DirtyDot />}
    </span>
  )
}

function ChipSelect({
  value,
  onChange,
  options,
  dirty,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  dirty?: boolean
}) {
  return (
    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[10px] bg-[#F1F5F9] px-2.5 py-1.5 text-[11.5px] font-bold text-navy">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-0 bg-transparent text-[11.5px] font-bold text-navy outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {dirty && <DirtyDot />}
    </span>
  )
}

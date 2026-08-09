'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Briefcase,
  Building,
  Edit2,
  Home2,
  Maximize4,
  More,
  Trash,
} from 'iconsax-react'
import type { User } from 'firebase/auth'
import type { Property } from '@/lib/live/types'
import { addressLabel, cityLabel, priceLabel, primaryImage } from '@/lib/live/api'
import { useAuthGate } from '@/components/keyz/auth/AuthGate'
import { fetchMyProperties } from './portal-api'
import { deleteProperty } from './ezra/ezra-api'

const PROPERTIES_REASON = 'כדי לראות את הנכסים שפרסמת ולנהל אותם'

const STATUS_LABELS: Record<string, { text: string; cls: string }> = {
  active: { text: 'פעיל', cls: 'bg-emerald-50 text-emerald-600' },
  paused: { text: 'מושהה', cls: 'bg-amber-50 text-amber-600' },
  draft: { text: 'טיוטה', cls: 'bg-slate-100 text-slate-500' },
  rented: { text: 'הושכר', cls: 'bg-blue-50 text-blue-600' },
}

// ── Per-card action menu ──────────────────────────────────────────────────────
function PropertyActionMenu({
  propertyId,
  onEdit,
  onDelete,
  onClose,
}: {
  propertyId: string
  onEdit: () => void
  /** Actually deletes the row server-side (DELETE /properties/{id}) and drops it from the list. */
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="absolute left-0 top-full z-50 mt-2 w-[220px] rounded-2xl border border-border-app bg-white p-3.5 shadow-[0_12px_32px_rgba(7,41,70,0.14)]">
        <p className="text-[12.5px] font-bold text-navy">למחוק את המודעה הזו לצמיתות?</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true)
              await onDelete(propertyId)
              onClose()
            }}
            className="flex-1 rounded-full bg-coral px-3 py-2 text-[12px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {deleting ? 'מוחקים…' : 'מחיקה'}
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => setConfirming(false)}
            className="flex-1 rounded-full bg-cloud px-3 py-2 text-[12px] font-bold text-navy transition hover:bg-border-app"
          >
            ביטול
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute left-0 top-full z-50 mt-2 min-w-[170px] overflow-hidden rounded-2xl border border-border-app bg-white shadow-[0_12px_32px_rgba(7,41,70,0.14)]">
      <button
        type="button"
        onClick={() => { onEdit(); onClose() }}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-[13px] font-bold text-navy hover:bg-cloud transition-colors"
      >
        <Edit2 size={16} color="currentColor" />
        עריכת מודעה
      </button>
      <div className="my-1 border-t border-border-app" />
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-[13px] font-bold text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash size={16} color="currentColor" />
        מחיקת מודעה
      </button>
    </div>
  )
}

// ── Property card — AssistantPropertyCard design + 3-dot menu ────────────────
function PublisherPropertyCard({
  property,
  onEditProperty,
  onDeleteProperty,
}: {
  property: Property
  onEditProperty?: (p: Property) => void
  onDeleteProperty: (id: string) => Promise<void>
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const img = primaryImage(property)
  const status = STATUS_LABELS[property.status ?? 'active'] ?? STATUS_LABELS.active
  const isBroker = property.agencyListing === true

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div className="w-full overflow-hidden rounded-[28px] border border-border-app bg-white card-shadow transition duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(7,41,70,0.10)]">
      {/* Media block — 4px inset, inner radius 22px */}
      <div className="p-1">
        <div className="relative aspect-[2.1] overflow-hidden rounded-[22px]">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={addressLabel(property)} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-primary-light2">
              <Building size={48} color="#2563EB" />
            </div>
          )}

          {/* Status badge — top-right */}
          <span
            className={`absolute top-2.5 right-2.5 rounded-full px-3 py-1 text-[11.5px] font-bold badge-shadow bg-white/90 ${status.cls}`}
          >
            {status.text}
          </span>

          {/* 3-dot action menu — top-left */}
          <div ref={menuRef} className="absolute top-2.5 left-2.5">
            <button
              type="button"
              aria-label="אפשרויות"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((v) => !v)
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white badge-shadow hover:bg-cloud transition-colors cursor-pointer"
            >
              <More size={15} color="#072946" />
            </button>
            {menuOpen && (
              <PropertyActionMenu
                propertyId={property.id ?? ''}
                onEdit={() => onEditProperty?.(property)}
                onDelete={onDeleteProperty}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <Link href={`/listing/${property.id}`} className="block px-3.5 pt-2 pb-3.5">
        {/* Row 1 — price + broker tag */}
        <div className="flex items-center justify-between gap-3">
          <div className="whitespace-nowrap text-[17.5px] font-black text-navy">{priceLabel(property)}</div>
          {isBroker && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary-light2 px-2.5 py-1 text-[11px] font-extrabold text-primary">
              <Briefcase size={12} color="#2563EB" variant="Bold" />
              מתווך
            </span>
          )}
        </div>

        {/* Row 2 — type · rooms · size */}
        <div className="no-scrollbar mt-2 flex flex-row gap-1.5 overflow-x-auto">
          <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-[#F1F5F9] px-2.5 py-1.5 text-[11.5px] font-bold text-navy">
            <Building size={14} color="#072946" />
            {property.propertyType || 'דירה'}
          </span>
          {property.rooms != null && (
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-[#F1F5F9] px-2.5 py-1.5 text-[11.5px] font-bold text-navy">
              <Home2 size={14} color="#072946" />
              {property.rooms} חדרים
            </span>
          )}
          {property.sizeM2 != null && (
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-[#F1F5F9] px-2.5 py-1.5 text-[11.5px] font-bold text-navy">
              <Maximize4 size={14} color="#072946" />
              {property.sizeM2} מ״ר
            </span>
          )}
          {!isBroker && (
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-[#ECFDF5] px-2.5 py-1.5 text-[11.5px] font-extrabold text-[#059669]">
              <Briefcase size={13} color="#059669" />
              לא מתיווך
            </span>
          )}
        </div>

        {/* Row 3 — address */}
        <div className="mt-2 truncate text-[14px] font-black text-navy">
          {addressLabel(property)}
          {cityLabel(property) && (
            <span className="mr-1.5 text-[12px] font-semibold text-secondary-text">
              · {cityLabel(property)}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}

// ── Main tab component ────────────────────────────────────────────────────────
export default function PropertiesTab({
  user,
  onEditProperty,
}: {
  user: User | null
  onEditProperty?: (p: Property) => void
}) {
  const [items, setItems] = useState<Property[] | null>(null)
  const [error, setError] = useState(false)
  const { requireAuth } = useAuthGate()
  const uid = user?.uid ?? null

  useEffect(() => {
    if (!uid) {
      setItems([])
      return
    }
    let alive = true
    fetchMyProperties(uid)
      .then((props) => alive && setItems(props))
      .catch(() => {
        if (alive) {
          setItems([])
          setError(true)
        }
      })
    return () => {
      alive = false
    }
  }, [uid])

  async function handleDelete(id: string) {
    try {
      await deleteProperty(id)
      setItems((prev) => (prev ? prev.filter((p) => p.id !== id) : prev))
    } catch {
      // Left in place — the row still exists server-side, so hiding it would lie.
    }
  }

  if (!uid) {
    return (
      <div className="text-center bg-cloud rounded-[28px] px-6 py-12 max-w-[500px] mx-auto">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-primary-light2 text-primary items-center justify-center">
          <Building size={26} variant="Bold" color="currentColor" />
        </span>
        <div className="font-black text-navy mt-4">הנכסים שלך יופיעו כאן</div>
        <p className="text-secondary-text text-sm mt-1.5 leading-relaxed">
          מתחברים עם אותו חשבון כמו באפליקציה, וכל הדירות שפרסמת מופיעות כאן — מסונכרן לגמרי.
        </p>
        <button
          onClick={() => requireAuth(PROPERTIES_REASON, () => {})}
          className="mt-5 inline-flex items-center justify-center gap-2 bg-white border border-border-app hover:border-primary/40 transition-colors rounded-full px-5 py-2.5 font-bold text-navy text-sm"
        >
          <span className="w-5 h-5 rounded-full bg-cloud border border-border-app flex items-center justify-center text-[10px] font-black text-primary">G</span>
          התחברות עם Google
        </button>
      </div>
    )
  }

  if (items === null) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-secondary-text bg-cloud rounded-2xl px-4 py-10 max-w-[500px] mx-auto">
        לא הצלחנו לטעון את הנכסים כרגע. נסו לרענן את העמוד.
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center bg-cloud rounded-[28px] px-6 py-12 max-w-[500px] mx-auto">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-primary-light2 text-primary items-center justify-center">
          <Building size={26} variant="Bold" color="currentColor" />
        </span>
        <div className="font-black text-navy mt-4">עוד אין נכסים</div>
        <p className="text-secondary-text text-sm mt-1.5">
          מפרסמים את הדירה הראשונה בשיחה קצרה עם עזרא — בלשונית &quot;הוספת דירה&quot;.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-[1100px] mx-auto w-full py-4 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((p) => (
          <PublisherPropertyCard
            key={p.id}
            property={p}
            onEditProperty={onEditProperty}
            onDeleteProperty={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}

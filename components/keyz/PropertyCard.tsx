'use client'

// Web port of the app's AssistantPropertyCard — see
// docs/research/components/property-card.spec.md (source of truth).
import { useEffect, useSyncExternalStore } from 'react'
import {
  Briefcase,
  Building,
  Bus,
  Buildings,
  Coffee,
  Heart,
  Home2,
  Maximize4,
  Send2,
  Sun1,
  Teacher,
  Tree,
} from 'iconsax-react'
import type { Icon } from 'iconsax-react'
import { addressLabel, cityLabel, priceLabel, primaryImage } from '@/lib/live/api'
import type { Property } from '@/lib/live/types'
import { ensureLoaded, isSavedCached, onSavedChange, toggleSaved as toggleSavedRemote } from '@/lib/live/saved'
import { useAuthGate } from '@/components/keyz/auth/AuthGate'

// Geo-tag emoji prefixes → iconsax icon (emoji is stripped from the label).
const GEO_ICONS: [string, Icon][] = [
  ['🏫', Buildings],
  ['🌳', Tree],
  ['🚉', Bus],
  ['🏖️', Sun1],
  ['🏖', Sun1], // without variation selector
  ['🎓', Teacher],
  ['🍸', Coffee],
]

function geoIconFor(tag: string): [Icon, string] | null {
  for (const [emoji, IconCmp] of GEO_ICONS) {
    if (tag.startsWith(emoji)) return [IconCmp, tag.slice(emoji.length).trim()]
  }
  return null
}

export default function PropertyCard({
  property,
  onSelect,
}: {
  property: Property
  onSelect?: () => void
}) {
  const saved = useSyncExternalStore(
    onSavedChange,
    () => isSavedCached(property.id),
    () => false,
  )
  useEffect(() => {
    void ensureLoaded()
  }, [])

  const img = primaryImage(property)
  // Broker tag shows ONLY for a listing the data actually marks as agency-listed
  // — a private listing carries no tag at all.
  const isBroker = property.agencyListing === true

  const tags = property.smartTags ?? []
  const geoTags = tags
    .map((t) => geoIconFor(t))
    .filter((t): t is [Icon, string] => t !== null)
  const plainTags = tags.filter((t) => geoIconFor(t) === null).slice(0, 3)

  // Some callers (app/real-estate/Browse.tsx) wrap the whole card in a plain
  // <a href="/listing/…">, not a React onClick — stopPropagation alone never
  // stopped that: it only blocks bubbling through React's own synthetic event
  // system, not a native anchor's default navigation. preventDefault is the
  // one that actually matters here.
  const share = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({ title: addressLabel(property), text: `${addressLabel(property)} · ${priceLabel(property)}` })
        .catch(() => {})
    }
  }

  // Saving while anonymous writes to a throwaway anon uid — the heart "works"
  // but everything saved vanishes when the user registers, and never appears
  // in the app. Gate the save behind a real account so it lands on the SAME
  // uid the app reads.
  const { requireAuth } = useAuthGate()
  const toggleSaved = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    requireAuth('כדי לשמור דירות ולראות אותן גם באפליקציה', () =>
      toggleSavedRemote(property.id, !saved),
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect?.()}
      className="w-full shrink-0 cursor-pointer overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-xs transition duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:scale-[0.98]"
    >
      {/* Media block — 4px inset, inner radius 22px */}
      <div className="p-1">
        <div className="relative aspect-[2.1] overflow-hidden rounded-[22px]">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={addressLabel(property)} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-primary-light2">
              <Building size={48} color="#2563EB" />
            </div>
          )}

          {/* Actions — physical bottom-left */}
          <div className="absolute bottom-2 left-2 flex flex-row gap-2">
            <button
              type="button"
              aria-label={saved ? 'הסרה מהשמורים' : 'שמירה'}
              onClick={toggleSaved}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white badge-shadow"
            >
              <Heart size={15} variant={saved ? 'Bold' : 'Linear'} color={saved ? '#FF5A67' : '#072946'} />
            </button>
            <button
              type="button"
              aria-label="שיתוף"
              onClick={share}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white badge-shadow"
            >
              <Send2 size={15} color="#072946" />
            </button>
          </div>
        </div>
      </div>

      {/* Body — three rows:
          1) price (start) · broker tag (end)
          2) type · rooms · size · (לא מתיווך)
          3) address */}
      <div className="px-3.5 pt-2 pb-3.5">
        {/* Row 1 */}
        <div className="flex items-center justify-between gap-3">
          <div className="whitespace-nowrap text-[17.5px] font-black text-navy">{priceLabel(property)}</div>
          {isBroker ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary-light2 px-2.5 py-1 text-[11px] font-extrabold text-primary">
              <Briefcase size={12} color="#2563EB" variant="Bold" />
              מתווך
            </span>
          ) : (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-extrabold text-[#059669]">
              <Briefcase size={12} color="#059669" />
              לא מתיווך
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
          {plainTags.map((tag) => (
            <span
              key={tag}
              className="shrink-0 whitespace-nowrap rounded-[10px] bg-[#F1F5F9] px-2.5 py-1.5 text-[11.5px] font-bold text-navy"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Row 3 — address (city kept as a muted suffix on the same line) */}
        <div className="mt-2 truncate text-[14px] font-black text-navy">
          {addressLabel(property)}
          {cityLabel(property) && (
            <span className="mr-1.5 text-[12px] font-semibold text-secondary-text">
              · {cityLabel(property)}
            </span>
          )}
        </div>

        {/* Geo tags */}
        {geoTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {geoTags.map(([GeoIcon, label]) => (
              <span
                key={label}
                className="flex items-center gap-1.5 rounded-[10px] border border-[rgba(37,99,235,0.18)] bg-[rgba(37,99,235,0.08)] px-2.5 py-1.5"
              >
                <GeoIcon size={15} color="#2563EB" />
                <span className="text-[12.5px] font-semibold text-navy">{label}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

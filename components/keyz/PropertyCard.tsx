'use client'

// Web port of the app's AssistantPropertyCard — see
// docs/research/components/property-card.spec.md (source of truth).
import { useState } from 'react'
import {
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
  TickCircle,
  Tree,
} from 'iconsax-react'
import type { Icon } from 'iconsax-react'
import { addressLabel, cityLabel, priceLabel, primaryImage } from '@/lib/live/api'
import type { Property } from '@/lib/live/types'

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
  const [saved, setSaved] = useState(false)

  const img = primaryImage(property)
  const verified = (property as Property & { verified?: boolean }).verified === true

  const tags = property.smartTags ?? []
  const geoTags = tags
    .map((t) => geoIconFor(t))
    .filter((t): t is [Icon, string] => t !== null)
  const plainTags = tags.filter((t) => geoIconFor(t) === null).slice(0, 3)

  const share = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({ title: addressLabel(property), text: `${addressLabel(property)} · ${priceLabel(property)}` })
        .catch(() => {})
    }
  }

  const toggleSaved = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSaved((s) => !s)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect?.()}
      className="w-[340px] shrink-0 cursor-pointer overflow-hidden rounded-[28px] border border-border-app bg-white card-shadow transition duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(7,41,70,0.10)] active:scale-[0.97]"
    >
      {/* Media block — 5px inset, inner radius 24px */}
      <div className="p-[5px]">
        <div className="relative aspect-[1.84] overflow-hidden rounded-3xl">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={addressLabel(property)} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-primary-light2">
              <Building size={48} color="#2563EB" />
            </div>
          )}

          {/* Type badge — physical top-right */}
          <div className="absolute top-[10px] right-[10px] rounded-[20px] bg-white px-[10px] py-[6px] badge-shadow">
            <span className="text-[12px] font-extrabold text-navy">{property.propertyType || 'דירה'}</span>
          </div>

          {/* Verified badge — physical top-left */}
          {verified && (
            <div className="absolute top-[10px] left-[10px] flex items-center gap-[3px] rounded-[20px] bg-white px-2 py-[5px] badge-shadow">
              <TickCircle size={13} color="#27AE60" variant="Bold" />
              <span className="text-[11px] font-extrabold text-navy">מאומת</span>
            </div>
          )}

          {/* Actions — physical bottom-left */}
          <div className="absolute bottom-[10px] left-[10px] flex flex-row gap-2">
            <button
              type="button"
              aria-label={saved ? 'הסרה מהשמורים' : 'שמירה'}
              onClick={toggleSaved}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white badge-shadow"
            >
              <Heart size={17} variant={saved ? 'Bold' : 'Linear'} color={saved ? '#FF5A67' : '#072946'} />
            </button>
            <button
              type="button"
              aria-label="שיתוף"
              onClick={share}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white badge-shadow"
            >
              <Send2 size={17} color="#072946" />
            </button>
          </div>
        </div>
      </div>

      {/* Body — 8px 12px 16px */}
      <div className="px-3 pt-2 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[17px] font-black text-navy">{addressLabel(property)}</div>
            <div className="mt-1 truncate text-[12px] font-semibold text-secondary-text">{cityLabel(property)}</div>
          </div>
          <div className="shrink-0 whitespace-nowrap text-[18px] font-black text-navy">{priceLabel(property)}</div>
        </div>

        {/* Info chips */}
        <div className="mt-2.5 flex flex-row gap-2 overflow-hidden">
          <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#F1F5F9] px-3 py-2 text-[12px] font-bold text-navy">
            <Home2 size={14} color="#072946" />
            {property.rooms} חדרים
          </span>
          {property.sizeM2 != null && (
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#F1F5F9] px-3 py-2 text-[12px] font-bold text-navy">
              <Maximize4 size={14} color="#072946" />
              {property.sizeM2} מ״ר
            </span>
          )}
          {plainTags.map((tag) => (
            <span
              key={tag}
              className="shrink-0 whitespace-nowrap rounded-xl bg-[#F1F5F9] px-3 py-2 text-[12px] font-bold text-navy"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Geo tags */}
        {geoTags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
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

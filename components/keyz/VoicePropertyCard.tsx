'use client'

// Web port of the app's immersive voice property card —
// lib/presentation/widgets/ati_voice_property_card.dart (AtiVoicePropertyCard).
// Full-bleed hero, glass status/heart badges, warm dark-glass bottom overlay.
import { useState } from 'react'
import { ArrowLeft2, Building, Heart } from 'iconsax-react'
import { addressLabel, cityLabel, priceLabel, primaryImage } from '@/lib/live/api'
import type { Property } from '@/lib/live/types'

const CORAL = '#FF5A67'
const RENT_DOT = '#00FF66'

// Mirrors RentalProperty.roomsLabel — drop the trailing ".0" on whole numbers.
function roomsLabel(rooms: number): string {
  return rooms % 1 === 0 ? String(Math.trunc(rooms)) : String(rooms)
}

// One column of the facts grid: a muted label above the value.
function Cell({
  label,
  value,
  hint,
  strong,
  className,
}: {
  label: string
  value: string
  hint?: string
  strong?: boolean
  className?: string
}) {
  return (
    <div className={['min-w-0', className ?? ''].join(' ')}>
      <dt className="truncate text-[10.5px] font-semibold tracking-[0.2px] text-white/55">{label}</dt>
      <dd
        className={[
          'truncate font-black text-white',
          strong ? 'text-[19px] leading-tight' : 'text-[15px] leading-tight',
        ].join(' ')}
        title={value}
      >
        {value}
      </dd>
      {hint && <div className="truncate text-[11px] font-semibold text-white/60">{hint}</div>}
    </div>
  )
}

export default function VoicePropertyCard({
  property,
  className,
}: {
  property: Property
  className?: string
}) {
  const [saved, setSaved] = useState(false)

  const img = primaryImage(property)
  const isSale = property.transactionType === 'sale'

  // priceLabel() returns "₪7,200/חודש" (rent) or "₪2,450,000" (sale) — the app
  // renders the number and the suffix on two separate lines, so split them.
  const priceMain = priceLabel(property).split('/')[0]
  // RentalProperty.priceSuffixLabel: sale → 'למכירה', rent → 'לחודש'.
  const priceSuffix = isSale ? 'למכירה' : 'לחודש'

  // App: '$neighborhood, $city' when a neighborhood exists, else just the city.
  const location = property.neighborhood
    ? `${property.neighborhood}, ${property.city ?? ''}`.replace(/, $/, '')
    : cityLabel(property)

  const floor = property.floor?.trim()

  const toggleSaved = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSaved((s) => !s)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ') e.preventDefault()
      }}
      className={[
        // Landscape format: long base, short rise. The glass band below is a
        // single horizontal row so it stays slim inside the short card.
        'relative h-[210px] w-full cursor-pointer overflow-hidden rounded-[30px] bg-[#0F172A] sm:h-[230px]',
        'shadow-[0_10px_24px_rgba(0,0,0,0.35)] transition duration-200 ease-out',
        'hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(0,0,0,0.45)] active:scale-[0.97]',
        className ?? '',
      ].join(' ')}
    >
      {/* Full-bleed hero media */}
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt={location || 'דירה'} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#072946]">
          <Building size={48} color="rgba(255,255,255,0.3)" />
        </div>
      )}

      {/* Status badge — physical top-left */}
      <div className="absolute left-3.5 top-3.5 flex items-center gap-2 rounded-[22px] border border-white/[0.16] bg-black/45 px-3.5 py-2 backdrop-blur-md">
        <span
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: isSale ? CORAL : RENT_DOT,
            boxShadow: `0 0 6px ${isSale ? 'rgba(255,90,103,0.5)' : 'rgba(0,255,102,0.5)'}`,
          }}
        />
        <span className="text-[13px] font-bold tracking-[0.2px] text-white">
          {isSale ? 'למכירה' : 'להשכרה'}
        </span>
      </div>

      {/* Heart / save — physical top-right */}
      <button
        type="button"
        aria-label={saved ? 'הסרה מהשמורים' : 'שמירה'}
        aria-pressed={saved}
        onClick={toggleSaved}
        className="absolute right-3.5 top-3.5 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.18] bg-black/[0.38] backdrop-blur-md"
      >
        <Heart size={19} variant={saved ? 'Bold' : 'Linear'} color={saved ? CORAL : '#FFFFFF'} />
      </button>

      {/* Warm dark-glass band — the listing's facts as a grid of columns:
          type · price · rooms · size · address (each a labelled cell). */}
      <div
        className="absolute inset-x-3 bottom-3 rounded-[24px] border border-white/15 px-4 py-3 shadow-[0_8px_18px_rgba(0,0,0,0.35)] backdrop-blur-xl"
        style={{ backgroundImage: 'linear-gradient(to bottom, #2C2317D9, #16120CF2)' }}
      >
        <div className="flex items-center gap-3">
          <dl className="grid min-w-0 flex-1 grid-cols-3 items-start gap-x-4 gap-y-2 sm:grid-cols-5">
            <Cell label="סוג" value={property.propertyType || 'נכס'} />
            <Cell label={priceSuffix} value={priceMain} strong />
            <Cell label="חדרים" value={property.rooms != null ? roomsLabel(property.rooms) : '—'} />
            <Cell label="מ״ר" value={property.sizeM2 != null ? String(property.sizeM2) : '—'} />
            <Cell
              label="כתובת"
              value={addressLabel(property)}
              hint={location}
              className="col-span-3 sm:col-span-1"
            />
          </dl>

          {/* "Go" affordance — RTL forward direction (app uses arrow_left) */}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.12]">
            <ArrowLeft2 size={19} color="#FFFFFF" />
          </span>
        </div>
      </div>
    </div>
  )
}

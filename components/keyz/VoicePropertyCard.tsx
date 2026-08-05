'use client'

// Web port of the app's immersive voice property card —
// lib/presentation/widgets/ati_voice_property_card.dart (AtiVoicePropertyCard).
// Full-bleed hero, glass status/heart badges, warm dark-glass bottom overlay.
import { useState } from 'react'
import { ArrowLeft2, Building, Heart, Home, Layer, Location, Maximize3 } from 'iconsax-react'
import { cityLabel, priceLabel, primaryImage } from '@/lib/live/api'
import type { Property } from '@/lib/live/types'

const CORAL = '#FF5A67'
const RENT_DOT = '#00FF66'
const GOLD = '#E5B86E'

// Mirrors RentalProperty.roomsLabel — drop the trailing ".0" on whole numbers.
function roomsLabel(rooms: number): string {
  return rooms % 1 === 0 ? String(Math.trunc(rooms)) : String(rooms)
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
        'relative h-[420px] w-full cursor-pointer overflow-hidden rounded-[30px] bg-[#0F172A]',
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
        className="absolute right-3.5 top-3.5 flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.18] bg-black/[0.38] backdrop-blur-md"
      >
        <Heart size={21} variant={saved ? 'Bold' : 'Linear'} color={saved ? CORAL : '#FFFFFF'} />
      </button>

      {/* Warm dark-glass bottom overlay */}
      <div
        className="absolute inset-x-3 bottom-3 rounded-[26px] border border-white/15 px-4 pb-3.5 pt-4 shadow-[0_8px_18px_rgba(0,0,0,0.35)] backdrop-blur-xl"
        style={{ backgroundImage: 'linear-gradient(to bottom, #2C2317D9, #16120CF2)' }}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[26px] font-black leading-tight text-white">{priceMain}</div>
            <div className="mt-0.5 text-[13px] font-semibold text-white/75">{priceSuffix}</div>
            {location && (
              <div className="mt-2 flex items-center gap-[5px]">
                <span className="shrink-0">
                  <Location size={16} color={GOLD} />
                </span>
                <span className="truncate text-[15px] font-bold text-white">{location}</span>
              </div>
            )}
          </div>

          {/* "Go" affordance — RTL forward direction (app uses arrow_left) */}
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/[0.12]">
            <ArrowLeft2 size={20} color="#FFFFFF" />
          </span>
        </div>

        {/* Glass info pills */}
        <div className="no-scrollbar mt-3.5 flex flex-row gap-2 overflow-x-auto">
          {property.rooms != null && (
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[18px] border border-white/[0.14] bg-white/10 px-3 py-2 text-[13px] font-bold text-white">
              <Home size={14} color="#FFFFFF" />
              {roomsLabel(property.rooms)} חדרים
            </span>
          )}
          {property.sizeM2 != null && (
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[18px] border border-white/[0.14] bg-white/10 px-3 py-2 text-[13px] font-bold text-white">
              <Maximize3 size={14} color="#FFFFFF" />
              {property.sizeM2} מ״ר
            </span>
          )}
          {floor && (
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[18px] border border-white/[0.14] bg-white/10 px-3 py-2 text-[13px] font-bold text-white">
              <Layer size={14} color="#FFFFFF" />
              קומה {floor}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

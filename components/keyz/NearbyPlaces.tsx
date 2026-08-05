'use client'

// "מה יש בסביבה" — web port of the app's NearbyPlacesCard (showAllKinds: true):
// every nearby layer with data, real named places + distances, persona-agnostic.
// Data comes from lib/live/nearby.ts (verbatim port of the app's Overpass query).
//
// Labels are the app's own: 1:1 kinds use nearby_places_card.dart _meta;
// the Overpass-merged categories (health / worship / transit) use the app's
// Area-Intelligence labels for those same category keys.

import { useEffect, useState } from 'react'
import {
  Bus,
  Buildings,
  EmojiHappy,
  ExportSquare,
  Gallery,
  Game,
  Health,
  Hospital,
  Reserve,
  ShoppingCart,
  Teacher,
  Tree,
  Weight,
  type Icon,
} from 'iconsax-react'
import { distLabel, fetchNearby, type NearbyPlace } from '@/lib/live/nearby'

// Section order mirrors the app's fallbackOrder (nearby_relevance.dart),
// restricted to the categories the Overpass layer returns. Radius shown is the
// actual query radius (one 2 km request covers every kind, as in the app).
const KINDS: { key: string; label: string; icon: Icon }[] = [
  { key: 'schools', label: 'בתי ספר קרובים', icon: Teacher },
  { key: 'kindergartens', label: 'גנים קרובים', icon: EmojiHappy },
  { key: 'health', label: 'שירותי בריאות', icon: Hospital },
  { key: 'pharmacies', label: 'בתי מרקחת קרובים', icon: Health },
  { key: 'supermarkets', label: 'סופרים קרובים', icon: ShoppingCart },
  { key: 'parks', label: 'פארקים קרובים', icon: Tree },
  { key: 'playgrounds', label: 'גני שעשועים קרובים', icon: Game },
  { key: 'transit', label: 'תחבורה ציבורית', icon: Bus },
  { key: 'worship', label: 'בתי כנסת ותפילה', icon: Buildings },
  { key: 'culture', label: 'מוסדות תרבות קרובים', icon: Gallery },
  { key: 'dining', label: 'מסעדות ובתי קפה קרובים', icon: Reserve },
  { key: 'gyms', label: 'חדרי כושר קרובים', icon: Weight },
]

const RADIUS_KM = 2 // one 2000 m Overpass request, like the app
const CAP_PER_KIND = 120 // app helpers cap each kind at 120
const COLLAPSED_ROWS = 10 // app paginates places 10 at a time

type Section = { key: string; label: string; icon: Icon; places: NearbyPlace[] }

function googleHref(name: string, city?: string): string {
  const q = encodeURIComponent(city && city.trim() ? `${name} ${city}` : name)
  return `https://www.google.com/search?q=${q}`
}

function SectionSkeleton() {
  return (
    <div className="animate-pulse rounded-[28px] border border-border-app bg-white p-5 card-shadow">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`flex items-center gap-3 ${i > 0 ? 'mt-4' : ''}`}>
          <div className="h-10 w-10 rounded-xl bg-primary-light2" />
          <div className="flex-1">
            <div className="h-3.5 w-40 rounded bg-cloud" />
            <div className="mt-1.5 h-3 w-56 rounded bg-cloud" />
          </div>
          <div className="h-5 w-16 rounded-full bg-cloud" />
        </div>
      ))}
    </div>
  )
}

export default function NearbyPlaces({ lat, lon, city }: { lat: number; lon: number; city?: string }) {
  const [loading, setLoading] = useState(true)
  const [sections, setSections] = useState<Section[]>([])
  const [open, setOpen] = useState(0) // accordion: one section open at a time (-1 = none)
  const [showAll, setShowAll] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSections([])
    setOpen(0)
    setShowAll({})
    fetchNearby(lat, lon)
      .then((byKind) => {
        if (cancelled) return
        setSections(
          KINDS.filter((k) => (byKind[k.key]?.length ?? 0) > 0).map((k) => ({
            ...k,
            places: byKind[k.key].slice(0, CAP_PER_KIND),
          })),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [lat, lon])

  if (loading) {
    return (
      <section dir="rtl">
        <h2 className="mt-8 mb-3 text-xl font-black text-navy">מה יש בסביבה</h2>
        <SectionSkeleton />
      </section>
    )
  }
  if (sections.length === 0) return null

  return (
    <section dir="rtl">
      <h2 className="mt-8 mb-3 text-xl font-black text-navy">מה יש בסביבה</h2>
      <div className="overflow-hidden rounded-[28px] border border-border-app bg-white card-shadow">
        {sections.map((s, i) => {
          const isOpen = open === i
          const expanded = showAll[s.key] === true
          const visible = expanded ? s.places : s.places.slice(0, COLLAPSED_ROWS)
          const hidden = s.places.length - COLLAPSED_ROWS
          const nearest = s.places[0]
          const IconCmp = s.icon
          return (
            <div key={s.key} className={i > 0 ? 'border-t border-border-app' : ''}>
              {/* Kind header — accordion row (icon square · title · nearest hint · count pill) */}
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-right transition hover:bg-cloud/60"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light2">
                  <IconCmp size={20} color="#2563EB" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-extrabold text-navy">{s.label}</span>
                  {!isOpen && nearest && (
                    <span className="block truncate text-[12px] text-secondary-text">
                      {nearest.name || 'ללא שם'} · {distLabel(nearest.km)}
                    </span>
                  )}
                </span>
                <span className="shrink-0 rounded-full bg-primary-light2 px-2.5 py-0.5 text-[11.5px] font-bold text-primary">
                  {s.places.length}
                  {s.places.length >= 12 ? '+' : ''} · {RADIUS_KM} ק״מ
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className={`h-5 w-5 shrink-0 text-secondary-text transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {/* Place rows */}
              {isOpen && (
                <div className="pb-2">
                  {visible.map((pl, j) => (
                    <a
                      key={`${pl.name}-${j}`}
                      href={googleHref(pl.name || s.label, city)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-2 transition hover:bg-cloud/60"
                    >
                      <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-navy">
                        {pl.name || 'ללא שם'}
                      </span>
                      <span className="shrink-0 text-[13px] font-bold text-secondary-text">
                        {distLabel(pl.km)}
                      </span>
                      <ExportSquare size={14} color="#5B7A99" className="shrink-0" />
                    </a>
                  ))}
                  {hidden > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAll((m) => ({ ...m, [s.key]: !expanded }))}
                      className="mx-5 my-2 rounded-full border border-primary px-4 py-2 text-[13px] font-extrabold text-primary transition hover:bg-primary-light2"
                    >
                      {expanded ? 'הצג פחות' : `צפה בכולם (+${hidden})`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

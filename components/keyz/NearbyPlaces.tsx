'use client'

// "מה יש בסביבה" — rebuilt end-to-end.
//
// Layout (all inside this component, incl. the section header):
//   1. Walking-minutes hero strip — nearest key place per decision-critical kind
//   2. SVG radar map (NearbyRadar) — bearing+distance-true POI map, no deps
//   3. Category tiles + ONE progressive-disclosure panel (not 12 accordions)
//
// Data via lib/live/nearby.ts loadNearby(): sessionStorage cache, strict-mode
// safe in-flight dedupe, abort-on-unmount. Kind labels are the app's own
// (nearby_places_card.dart _meta / Area-Intelligence) — kept verbatim.
//
// States: loading skeleton · error card with retry · no data → renders null
// (the section disappears entirely; the header lives here so it never orphans).

import { useEffect, useMemo, useState } from 'react'
import {
  Bus,
  Buildings,
  CloseCircle,
  EmojiHappy,
  ExportSquare,
  Gallery,
  Game,
  Health,
  Hospital,
  Refresh2,
  Reserve,
  ShoppingCart,
  Teacher,
  Tree,
  Weight,
  type Icon,
} from 'iconsax-react'
import {
  bearingDeg,
  distLabel,
  loadNearby,
  walkMinutes,
  type NearbyByKind,
  type NearbyPlace,
} from '@/lib/live/nearby'
import NearbyRadar, { type RadarDot, type RadarGroup } from './NearbyRadar'

// ---------------------------------------------------------------------------
// Static config
// ---------------------------------------------------------------------------

// Category groups → radar palette (derived from the design tokens).
const GROUPS: { key: string; label: string; color: string }[] = [
  { key: 'shopping', label: 'קניות', color: '#2563EB' },
  { key: 'education', label: 'חינוך', color: '#7C3AED' },
  { key: 'parks', label: 'פארקים ומשחק', color: '#15803D' },
  { key: 'health', label: 'בריאות', color: '#E11D48' },
  { key: 'transit', label: 'תחבורה', color: '#072946' },
  { key: 'dining', label: 'אוכל וקפה', color: '#C2410C' },
  { key: 'other', label: 'תרבות ופנאי', color: '#64748B' },
]

// Section order mirrors the app's fallbackOrder (nearby_relevance.dart);
// labels kept verbatim from the app. `group` maps each kind to a radar color.
const KINDS: { key: string; label: string; icon: Icon; group: string }[] = [
  { key: 'schools', label: 'בתי ספר קרובים', icon: Teacher, group: 'education' },
  { key: 'kindergartens', label: 'גנים קרובים', icon: EmojiHappy, group: 'education' },
  { key: 'health', label: 'שירותי בריאות', icon: Hospital, group: 'health' },
  { key: 'pharmacies', label: 'בתי מרקחת קרובים', icon: Health, group: 'health' },
  { key: 'supermarkets', label: 'סופרים קרובים', icon: ShoppingCart, group: 'shopping' },
  { key: 'parks', label: 'פארקים קרובים', icon: Tree, group: 'parks' },
  { key: 'playgrounds', label: 'גני שעשועים קרובים', icon: Game, group: 'parks' },
  { key: 'transit', label: 'תחבורה ציבורית', icon: Bus, group: 'transit' },
  { key: 'worship', label: 'בתי כנסת ותפילה', icon: Buildings, group: 'other' },
  { key: 'culture', label: 'מוסדות תרבות קרובים', icon: Gallery, group: 'other' },
  { key: 'dining', label: 'מסעדות ובתי קפה קרובים', icon: Reserve, group: 'dining' },
  { key: 'gyms', label: 'חדרי כושר קרובים', icon: Weight, group: 'other' },
]

// Decision-critical kinds for the hero strip (nearest place → walking minutes).
const HERO_KINDS: { key: string; label: string; icon: Icon }[] = [
  { key: 'supermarkets', label: 'סופר', icon: ShoppingCart },
  { key: 'kindergartens', label: 'גן ילדים', icon: EmojiHappy },
  { key: 'schools', label: 'בית ספר', icon: Teacher },
  { key: 'transit', label: 'תחנת תחבורה', icon: Bus },
  { key: 'parks', label: 'פארק', icon: Tree },
  { key: 'pharmacies', label: 'בית מרקחת', icon: Health },
]

const PANEL_ROWS = 8 // panel shows 8 places, "הצג עוד" reveals the rest (≤24)
const MAX_RADAR_DOTS = 90

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function googleHref(name: string, city?: string): string {
  const q = encodeURIComponent(city && city.trim() ? `${name} ${city}` : name)
  return `https://www.google.com/search?q=${q}`
}

function minutesLabel(km: number): string | null {
  const m = walkMinutes(km)
  if (m == null) return null
  return m >= 15 ? `${m} דק׳` : `${m} דק׳ הליכה`
}

type Section = {
  key: string
  label: string
  icon: Icon
  group: string
  places: NearbyPlace[]
}

type Status = 'loading' | 'error' | 'ready'

// ---------------------------------------------------------------------------
// Loading + error states
// ---------------------------------------------------------------------------

function Skeleton() {
  return (
    <div className="animate-pulse">
      {/* pill row */}
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-32 rounded-full border border-border-app bg-cloud" />
        ))}
      </div>
      {/* shimmering radar circle */}
      <div className="mt-4 rounded-[28px] border border-border-app bg-white p-5 card-shadow">
        <div className="mx-auto aspect-square w-full max-w-[300px] rounded-full bg-cloud" />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-7 w-20 rounded-full bg-cloud" />
          ))}
        </div>
      </div>
      {/* tile row */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl border border-border-app bg-cloud" />
        ))}
      </div>
    </div>
  )
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-[28px] border border-border-app bg-white p-8 text-center card-shadow">
      <p className="text-[15px] font-extrabold text-navy">לא הצלחנו לטעון את הסביבה כרגע</p>
      <p className="mt-1 text-[13px] text-secondary-text">
        ייתכן שהשירות עמוס — אפשר לנסות שוב בעוד רגע
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[14px] font-extrabold text-white transition hover:opacity-90"
      >
        <Refresh2 size={16} color="#fff" />
        נסה שוב
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NearbyPlaces({
  lat,
  lon,
  city,
}: {
  lat: number
  lon: number
  city?: string
}) {
  const [status, setStatus] = useState<Status>('loading')
  const [byKind, setByKind] = useState<NearbyByKind>({})
  const [retryTick, setRetryTick] = useState(0)
  const [openKind, setOpenKind] = useState<string | null>(null)
  const [showMore, setShowMore] = useState(false)

  const validCoords = Number.isFinite(lat) && Number.isFinite(lon)

  useEffect(() => {
    if (!validCoords) return
    let cancelled = false
    setStatus('loading')
    setOpenKind(null)
    setShowMore(false)
    const { promise, release } = loadNearby(lat, lon)
    promise
      .then((data) => {
        if (cancelled) return
        setByKind(data)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
      release() // aborts the Overpass fetch once no subscriber needs it
    }
  }, [lat, lon, retryTick, validCoords])

  // ----- derived structures (memoized, guarded) -----

  const sections = useMemo<Section[]>(
    () =>
      KINDS.flatMap((k) => {
        const places = byKind[k.key]
        return Array.isArray(places) && places.length > 0 ? [{ ...k, places }] : []
      }),
    [byKind],
  )

  const heroPills = useMemo(
    () =>
      HERO_KINDS.flatMap((h) => {
        const nearest = byKind[h.key]?.[0]
        if (!nearest) return []
        const label = minutesLabel(nearest.km)
        return label ? [{ ...h, minutes: label }] : []
      }),
    [byKind],
  )

  const { radarDots, radarGroups } = useMemo(() => {
    // Nearest-first per kind, round-robin across kinds, ≤ MAX_RADAR_DOTS total.
    const dots: RadarDot[] = []
    for (let rank = 0; dots.length < MAX_RADAR_DOTS; rank++) {
      let pushed = false
      for (const s of sections) {
        if (dots.length >= MAX_RADAR_DOTS) break
        const p = s.places[rank]
        if (!p) continue
        const b = bearingDeg(lat, lon, p.lat, p.lon)
        if (!Number.isFinite(p.km) || !Number.isFinite(b)) continue
        dots.push({ id: `${s.key}-${rank}`, name: p.name, km: p.km, bearing: b, group: s.group })
        pushed = true
      }
      if (!pushed) break
    }
    const counts = new Map<string, number>()
    for (const d of dots) counts.set(d.group, (counts.get(d.group) ?? 0) + 1)
    const groups: RadarGroup[] = GROUPS.flatMap((g) => {
      const count = counts.get(g.key) ?? 0
      return count > 0 ? [{ ...g, count }] : []
    })
    return { radarDots: dots, radarGroups: groups }
  }, [sections, lat, lon])

  const openSection = openKind != null ? sections.find((s) => s.key === openKind) ?? null : null
  const OpenIcon = openSection?.icon

  // ----- render (no branch can throw) -----

  if (!validCoords) return null

  if (status === 'loading') {
    return (
      <section dir="rtl">
        <h2 className="mt-8 mb-3 text-xl font-black text-navy">מה יש בסביבה</h2>
        <Skeleton />
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section dir="rtl">
        <h2 className="mt-8 mb-3 text-xl font-black text-navy">מה יש בסביבה</h2>
        <ErrorCard onRetry={() => setRetryTick((t) => t + 1)} />
      </section>
    )
  }

  if (sections.length === 0) return null

  return (
    <section dir="rtl">
      <h2 className="mt-8 mb-3 text-xl font-black text-navy">מה יש בסביבה</h2>

      {/* 1 — walking-minutes hero strip */}
      {heroPills.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {heroPills.map((p) => {
            const IconCmp = p.icon
            return (
              <span
                key={p.key}
                className="flex items-center gap-1.5 rounded-full border border-border-app bg-white px-3.5 py-2 text-[13px] font-extrabold text-navy card-shadow"
              >
                <IconCmp size={16} color="#2563EB" />
                {p.label}
                <span className="font-bold text-secondary-text">·</span>
                <span className="font-extrabold text-primary">{p.minutes}</span>
              </span>
            )
          })}
        </div>
      )}

      {/* 2 — radar map */}
      {radarDots.length > 0 && <NearbyRadar dots={radarDots} groups={radarGroups} />}

      {/* 3 — category tiles */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sections.map((s) => {
          const IconCmp = s.icon
          const isOpen = openKind === s.key
          const nearest = s.places[0]
          return (
            <button
              key={s.key}
              type="button"
              aria-expanded={isOpen}
              onClick={() => {
                setOpenKind(isOpen ? null : s.key)
                setShowMore(false)
              }}
              className={`rounded-2xl border p-3 text-right transition card-shadow ${
                isOpen
                  ? 'border-primary bg-primary-light2'
                  : 'border-border-app bg-white hover:border-primary/40'
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light2">
                <IconCmp size={20} color="#2563EB" />
              </span>
              <span className="mt-2 block truncate text-[13px] font-extrabold text-navy">
                {s.label}
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] font-bold text-secondary-text">
                {s.places.length} מקומות{nearest ? ` · הקרוב ${distLabel(nearest.km)}` : ''}
              </span>
            </button>
          )
        })}
      </div>

      {/* single progressive-disclosure panel below the grid */}
      <div
        className={`grid transition-all duration-300 ease-out ${
          openSection ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          {openSection && (
            <div className="rounded-2xl border border-border-app bg-white card-shadow">
              <div className="flex items-center gap-3 border-b border-border-app px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light2">
                  {OpenIcon && <OpenIcon size={18} color="#2563EB" />}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-extrabold text-navy">
                  {openSection.label}
                </span>
                <span className="shrink-0 rounded-full bg-primary-light2 px-2.5 py-0.5 text-[11.5px] font-bold text-primary">
                  {openSection.places.length}
                </span>
                <button
                  type="button"
                  aria-label="סגור"
                  onClick={() => setOpenKind(null)}
                  className="shrink-0 text-secondary-text transition hover:text-navy"
                >
                  <CloseCircle size={20} color="currentColor" />
                </button>
              </div>
              <div className="py-1.5">
                {openSection.places
                  .slice(0, showMore ? openSection.places.length : PANEL_ROWS)
                  .map((pl, j) => {
                    const mins = minutesLabel(pl.km)
                    return (
                      <a
                        key={`${openSection.key}-${j}`}
                        href={googleHref(pl.name || openSection.label, city)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 transition hover:bg-cloud/60"
                      >
                        <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-navy">
                          {pl.name || 'ללא שם'}
                        </span>
                        <span className="shrink-0 text-[12.5px] font-bold text-secondary-text">
                          {mins ? `${mins} · ` : ''}
                          {distLabel(pl.km)}
                        </span>
                        <ExportSquare size={14} color="#5B7A99" className="shrink-0" />
                      </a>
                    )
                  })}
                {!showMore && openSection.places.length > PANEL_ROWS && (
                  <button
                    type="button"
                    onClick={() => setShowMore(true)}
                    className="mx-4 my-2 rounded-full border border-primary px-4 py-2 text-[13px] font-extrabold text-primary transition hover:bg-primary-light2"
                  >
                    הצג עוד ({openSection.places.length - PANEL_ROWS})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

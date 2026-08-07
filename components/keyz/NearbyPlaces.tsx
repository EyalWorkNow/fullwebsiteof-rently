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
  Bag,
  Briefcase,
  Building3,
  Bus,
  Buildings,
  Car,
  CloseCircle,
  EmojiHappy,
  ExportSquare,
  Gallery,
  Game,
  Health,
  Heart,
  Hospital,
  Moon,
  Pet,
  Refresh2,
  Reserve,
  Routing,
  Routing2,
  ShoppingCart,
  Teacher,
  Tree,
  Weight,
  Drop,
  ArrowLeft2,
  ArrowRight2,
  ArrowDown2,
  ArrowUp2,
  type Icon,
} from 'iconsax-react'
import {
  bearingDeg,
  distLabel,
  loadNearby,
  walkLabel,
  type NearbyByKind,
  type NearbyPlace,
} from '@/lib/live/nearby'
import {
  coastDistance,
  loadGovdataPois,
  nearestCbd,
  nearestStation,
  nearestUniversity,
  poisWithin,
  type GovKind,
} from '@/lib/live/govdata'
import NearbyMap from './NearbyMap'
import NearbyRadar from './NearbyRadar'
import {
  GroupLegend,
  groupColor,
  type NearbyGroupWithCount,
  type NearbyPoi,
} from './nearby-groups'

// ---------------------------------------------------------------------------
// Static config
// ---------------------------------------------------------------------------

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
  // Bundled (offline) kinds ported from the app's govdata assets — see
  // lib/live/govdata.ts. Grouped into the SAME 7 palette colors above rather
  // than growing the palette: synagogues joins worship's group ('other'),
  // pools/dog_parks join parks, bike_share/parking/future_infra join transit,
  // coworking joins the culture/misc group ('other'), nightlife joins dining,
  // and retail joins shopping.
  { key: 'synagogues', label: 'בתי כנסת', icon: Building3, group: 'other' },
  { key: 'pools', label: 'בריכות שחייה', icon: Drop, group: 'parks' },
  { key: 'dog_parks', label: 'גני כלבים', icon: Pet, group: 'parks' },
  { key: 'vets', label: 'וטרינרים', icon: Heart, group: 'health' },
  { key: 'bike_share', label: 'אופניים משותפים', icon: Routing2, group: 'transit' },
  { key: 'coworking', label: 'חללי עבודה', icon: Briefcase, group: 'other' },
  { key: 'parking', label: 'חניה ציבורית', icon: Car, group: 'transit' },
  { key: 'nightlife_venues', label: 'חיי לילה', icon: Moon, group: 'dining' },
  { key: 'poi_retail', label: 'קניונים ומרכזי מסחר', icon: Bag, group: 'shopping' },
  { key: 'future_infra', label: 'תשתיות עתידיות', icon: Routing, group: 'transit' },
]

// Bundled govdata kinds merged into the same `byKind` map the Overpass fetch
// fills. Radius per kind is a judgment call: these datasets are much sparser
// than Overpass POIs (a handful of bike-share racks or dog parks per city,
// not per block), so a "nearby" radius wider than the 1.2km Overpass query
// still reads as genuinely local rather than noise. future_infra and
// poi_retail get the widest radius — planned transit lines and retail
// centers are relevant even a few km out.
const GOV_KINDS: GovKind[] = [
  'synagogues',
  'pools',
  'dog_parks',
  'vets',
  'bike_share',
  'coworking',
  'parking',
  'nightlife_venues',
  'poi_retail',
  'future_infra',
]

const GOV_RADIUS_KM: Record<GovKind, number> = {
  synagogues: 2,
  pools: 4,
  dog_parks: 3,
  vets: 4,
  bike_share: 2,
  coworking: 4,
  parking: 2,
  nightlife_venues: 3,
  poi_retail: 5,
  future_infra: 6,
}

// "מרחקים מרכזיים" hero pills — only shown when the distance is close enough
// to be a feature rather than noise (a property 90km from a university tells
// you nothing useful).
const KEY_DISTANCE_MAX_KM = 40

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

// "מרחקים מרכזיים" pills — distinct tint (primary-light2 fill) from the
// walking-minutes hero strip (white fill) so the two rows read as separate
// facts: "how far to walk" vs. "how far to the big landmarks".
function KeyDistances({ items }: { items: { key: string; text: string }[] }) {
  if (items.length === 0) return null
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {items.map((d) => (
        <span
          key={d.key}
          className="flex items-center gap-1.5 rounded-full border border-border-app bg-primary-light2 px-3.5 py-2 text-[13px] font-extrabold text-primary card-shadow"
        >
          {d.text}
        </span>
      ))}
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
  const [view, setView] = useState<'map' | 'radar'>('map')
  // Group visibility is lifted here so the legend chips drive BOTH views and
  // stay in sync when switching between the map and the radar.
  const [hiddenGroups, setHiddenGroups] = useState<ReadonlySet<string>>(new Set())
  const [categoryPage, setCategoryPage] = useState(0)
  const [showAllCategories, setShowAllCategories] = useState(false)
  // Flips once the bundled govdata JSON (incl. the precise rail_stations
  // list) has loaded, so the key-distances pills can upgrade from the
  // curated STATIONS fallback to the richer bundled station list.
  const [govReady, setGovReady] = useState(false)

  const validCoords = Number.isFinite(lat) && Number.isFinite(lon)

  useEffect(() => {
    if (!validCoords) return
    let cancelled = false
    setStatus('loading')
    setOpenKind(null)
    setShowMore(false)
    const { promise, release } = loadNearby(lat, lon)
    Promise.all([promise, loadGovdataPois()])
      .then(([data]) => {
        if (cancelled) return
        setGovReady(true)
        // Merge the bundled govdata kinds into the same NearbyByKind shape
        // the Overpass fetch produces, so the rest of the pipeline (sections,
        // radar dots, map, legend) treats all 22 kinds identically.
        const merged: NearbyByKind = { ...data }
        for (const kind of GOV_KINDS) {
          const places = poisWithin(kind, lat, lon, GOV_RADIUS_KM[kind])
          if (places.length > 0) {
            merged[kind] = places.map((p) => ({ ...p, kind }))
          }
        }

        // Default active layers: ONLY supermarkets, parks, health, transit
        const DEFAULT_ACTIVE_KEYS = new Set(['supermarkets', 'parks', 'health', 'transit'])
        const initialHidden = new Set<string>()
        for (const k of KINDS) {
          if (!DEFAULT_ACTIVE_KEYS.has(k.key)) {
            initialHidden.add(k.key)
          }
        }
        setHiddenGroups(initialHidden)

        setByKind(merged)
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

  // "מרחקים מרכזיים" — independent of the Overpass load (pure math over the
  // bundled constant lists), so it renders even while the section above is
  // still loading/erroring. Recomputes once govReady flips true so
  // nearestStation() can pick up the richer bundled rail_stations list.
  const keyDistances = useMemo(() => {
    if (!validCoords) return []
    const items: { key: string; text: string }[] = []
    const coast = coastDistance(lat, lon)
    if (coast != null && coast <= KEY_DISTANCE_MAX_KM) {
      items.push({ key: 'coast', text: `🌊 ${distLabel(coast)} מהים` })
    }
    const station = nearestStation(lat, lon)
    if (station && station.km <= KEY_DISTANCE_MAX_KM) {
      items.push({ key: 'station', text: `🚆 ${station.name} — ${distLabel(station.km)}` })
    }
    const cbd = nearestCbd(lat, lon)
    if (cbd && cbd.km <= KEY_DISTANCE_MAX_KM) {
      items.push({
        key: 'cbd',
        text: `🏙️ מרכז תעסוקה: ${cbd.name} — ${distLabel(cbd.km)}`,
      })
    }
    const uni = nearestUniversity(lat, lon)
    if (uni && uni.km <= KEY_DISTANCE_MAX_KM) {
      items.push({ key: 'university', text: `🎓 ${distLabel(uni.km)} מ-${uni.name}` })
    }
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, validCoords, govReady])

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
        const label = walkLabel(nearest.km)
        return label ? [{ ...h, minutes: label }] : []
      }),
    [byKind],
  )

  const { poiDots, poiGroups } = useMemo(() => {
    // Nearest-first per kind, round-robin across kinds, ≤ MAX_RADAR_DOTS total.
    // The SAME dot list feeds both the Leaflet map and the SVG radar.
    const dots: NearbyPoi[] = []
    for (let rank = 0; dots.length < MAX_RADAR_DOTS; rank++) {
      let pushed = false
      for (const s of sections) {
        if (dots.length >= MAX_RADAR_DOTS) break
        const p = s.places[rank]
        if (!p) continue
        const b = bearingDeg(lat, lon, p.lat, p.lon)
        if (!Number.isFinite(p.km) || !Number.isFinite(b)) continue
        dots.push({
          id: `${s.key}-${rank}`,
          name: p.name,
          km: p.km,
          lat: p.lat,
          lon: p.lon,
          bearing: b,
          group: s.key,
          kindLabel: s.label,
        })
        pushed = true
      }
      if (!pushed) break
    }
    const counts = new Map<string, number>()
    for (const d of dots) counts.set(d.group, (counts.get(d.group) ?? 0) + 1)

    const groups: NearbyGroupWithCount[] = sections.flatMap((s) => {
      const count = counts.get(s.key) ?? 0
      if (count <= 0) return []
      return [
        {
          key: s.key,
          label: s.label.replace(' קרובים', '').replace(' קרובות', ''),
          color: groupColor(s.key),
          count,
        },
      ]
    })
    return { poiDots: dots, poiGroups: groups }
  }, [sections, lat, lon])

  const toggleGroup = (key: string) => {
    setHiddenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const openSection = openKind != null ? sections.find((s) => s.key === openKind) ?? null : null
  const OpenIcon = openSection?.icon

  // ----- render (no branch can throw) -----

  if (!validCoords) return null

  if (status === 'loading') {
    return (
      <section dir="rtl">
        <h2 className="mt-8 mb-3 text-xl font-black text-navy">מה יש בסביבה</h2>
        <KeyDistances items={keyDistances} />
        <Skeleton />
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section dir="rtl">
        <h2 className="mt-8 mb-3 text-xl font-black text-navy">מה יש בסביבה</h2>
        <KeyDistances items={keyDistances} />
        <ErrorCard onRetry={() => setRetryTick((t) => t + 1)} />
      </section>
    )
  }

  if (sections.length === 0) {
    // No Overpass POIs at all — the section would normally vanish entirely,
    // but the key-distances facts are independent of Overpass and still
    // worth showing (e.g. a rural property with no nearby POIs but a real
    // "12km from the sea" fact).
    if (keyDistances.length === 0) return null
    return (
      <section dir="rtl">
        <h2 className="mt-8 mb-3 text-xl font-black text-navy">מה יש בסביבה</h2>
        <KeyDistances items={keyDistances} />
      </section>
    )
  }

  return (
    <section dir="rtl">
      {/* header + map/radar view switcher */}
      <div className="mt-8 mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-navy">מה יש בסביבה</h2>
        {poiDots.length > 0 && (
          <div className="flex rounded-full bg-cloud p-1" role="tablist" aria-label="תצוגת סביבה">
            {(
              [
                { key: 'map', label: 'מפה' },
                { key: 'radar', label: 'רדאר' },
              ] as const
            ).map((v) => (
              <button
                key={v.key}
                type="button"
                role="tab"
                aria-selected={view === v.key}
                onClick={() => setView(v.key)}
                className={`rounded-full px-4 py-1.5 text-[13px] font-extrabold transition ${
                  view === v.key ? 'bg-primary text-white' : 'text-navy hover:bg-white/60'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 0 — key distances (sea / train / employment center / university) */}
      <KeyDistances items={keyDistances} />

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

      {/* 2 — map / radar (same dots, same legend state) */}
      {poiDots.length > 0 && (
        <>
          {view === 'map' ? (
            <NearbyMap lat={lat} lon={lon} dots={poiDots} hidden={hiddenGroups} />
          ) : (
            <NearbyRadar dots={poiDots} hidden={hiddenGroups} />
          )}
          <GroupLegend groups={poiGroups} hidden={hiddenGroups} onToggle={toggleGroup} />
        </>
      )}

      {/* 3 — category tiles (2 rows x 4 columns grid, max 8 per page) */}
      {(() => {
        const PAGE_SIZE = 8
        const totalCategoryPages = Math.ceil(sections.length / PAGE_SIZE)
        const displayedSections = showAllCategories
          ? sections
          : sections.slice(categoryPage * PAGE_SIZE, (categoryPage + 1) * PAGE_SIZE)

        return (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-b border-border-app pb-2.5">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-black text-navy">קטגוריות בסביבה</h3>
                <span className="rounded-full bg-cloud px-2.5 py-0.5 text-[11.5px] font-bold text-secondary-text">
                  {showAllCategories
                    ? `${sections.length} קטגוריות`
                    : `8 מתוך ${sections.length}`}
                </span>
              </div>

              {sections.length > PAGE_SIZE && (
                <div className="flex items-center gap-2.5">
                  {!showAllCategories && totalCategoryPages > 1 && (
                    <div className="flex items-center gap-1 rounded-xl border border-border-app bg-white p-1 card-shadow">
                      <button
                        type="button"
                        disabled={categoryPage <= 0}
                        onClick={() => setCategoryPage((p) => Math.max(0, p - 1))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-cloud disabled:opacity-30 text-navy font-bold transition cursor-pointer"
                        aria-label="הקודם"
                      >
                        <ArrowRight2 size={16} color="currentColor" />
                      </button>
                      <span className="px-2 text-[11.5px] font-extrabold text-navy">
                        {categoryPage + 1} / {totalCategoryPages}
                      </span>
                      <button
                        type="button"
                        disabled={categoryPage >= totalCategoryPages - 1}
                        onClick={() => setCategoryPage((p) => Math.min(totalCategoryPages - 1, p + 1))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-cloud disabled:opacity-30 text-navy font-bold transition cursor-pointer"
                        aria-label="הבא"
                      >
                        <ArrowLeft2 size={16} color="currentColor" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowAllCategories((prev) => !prev)}
                    className="flex items-center gap-1 rounded-xl border border-border-app bg-white px-3 py-1.5 text-[12px] font-extrabold text-primary hover:bg-primary-light2 transition card-shadow cursor-pointer"
                  >
                    <span>{showAllCategories ? 'הצג 8 בלבד' : `הצג הכל (${sections.length})`}</span>
                    {showAllCategories ? (
                      <ArrowUp2 size={14} color="currentColor" />
                    ) : (
                      <ArrowDown2 size={14} color="currentColor" />
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {displayedSections.map((s) => {
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
                    className={`rounded-2xl border p-3 text-right transition card-shadow cursor-pointer ${
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
          </>
        )
      })()}

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
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-secondary-text transition hover:text-navy"
                >
                  <CloseCircle size={20} color="currentColor" />
                </button>
              </div>
              <div className="py-1.5">
                {openSection.places
                  .slice(0, showMore ? openSection.places.length : PANEL_ROWS)
                  .map((pl, j) => {
                    const mins = walkLabel(pl.km)
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

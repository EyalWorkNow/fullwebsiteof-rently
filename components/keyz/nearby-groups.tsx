'use client'

// Shared category-group model for the "מה יש בסביבה" views.
//
// Single source of truth for the 7-group palette + Hebrew labels used by BOTH
// the SVG radar (NearbyRadar) and the Leaflet map (NearbyMap), plus the shared
// legend-chip row that toggles group visibility (state lives in NearbyPlaces
// so switching views keeps the toggles in sync).

export interface NearbyGroup {
  key: string
  label: string
  color: string
}

export type NearbyGroupWithCount = NearbyGroup & { count: number }

/** One rendered POI — everything both views need (position, polar + labels). */
export interface NearbyPoi {
  id: string
  name: string
  km: number
  lat: number
  lon: number
  bearing: number // degrees, 0 = north, clockwise
  group: string
  kindLabel: string
}

// Palette derived from the design tokens.
export const NEARBY_GROUPS: NearbyGroup[] = [
  { key: 'shopping', label: 'קניות', color: '#2563EB' },
  { key: 'education', label: 'חינוך', color: '#7C3AED' },
  { key: 'parks', label: 'פארקים ומשחק', color: '#15803D' },
  { key: 'health', label: 'בריאות', color: '#E11D48' },
  { key: 'transit', label: 'תחבורה', color: '#072946' },
  { key: 'dining', label: 'אוכל וקפה', color: '#C2410C' },
  { key: 'other', label: 'תרבות ופנאי', color: '#64748B' },
]

const COLOR_BY_KEY = new Map(NEARBY_GROUPS.map((g) => [g.key, g.color]))

export function groupColor(key: string): string {
  return COLOR_BY_KEY.get(key) ?? '#64748B'
}

/** Legend chips — colored dot + label + count; toggling hides that group. */
export function GroupLegend({
  groups,
  hidden,
  onToggle,
}: {
  groups: NearbyGroupWithCount[]
  hidden: ReadonlySet<string>
  onToggle: (key: string) => void
}) {
  return (
    <div dir="rtl" className="mt-3 flex flex-wrap justify-center gap-2">
      {groups.map((g) => {
        const off = hidden.has(g.key)
        return (
          <button
            key={g.key}
            type="button"
            onClick={() => onToggle(g.key)}
            aria-pressed={!off}
            className={`flex items-center gap-1.5 rounded-full border border-border-app bg-white px-3 py-1.5 text-[12px] font-bold text-navy transition hover:bg-cloud/60 ${off ? 'opacity-40' : ''}`}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
            {g.label}
            <span className="text-secondary-text">{g.count}</span>
          </button>
        )
      })}
    </div>
  )
}

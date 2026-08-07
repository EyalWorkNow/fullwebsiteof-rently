'use client'

import React from 'react'
import {
  Bus,
  Coffee,
  Gallery,
  Health,
  ShoppingCart,
  Teacher,
  Tree,
  type Icon,
} from 'iconsax-react'

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

// Palette derived from design tokens
export const NEARBY_GROUPS: NearbyGroup[] = [
  { key: 'shopping', label: 'קניות', color: '#2563EB' },
  { key: 'education', label: 'חינוך', color: '#7C3AED' },
  { key: 'parks', label: 'פארקים ומשחק', color: '#15803D' },
  { key: 'health', label: 'בריאות', color: '#E11D48' },
  { key: 'transit', label: 'תחבורה', color: '#072946' },
  { key: 'dining', label: 'אוכל וקפה', color: '#C2410C' },
  { key: 'other', label: 'תרבות ופנאי', color: '#64748B' },
]

export const GROUP_ICONS: Record<string, Icon> = {
  shopping: ShoppingCart,
  education: Teacher,
  parks: Tree,
  health: Health,
  transit: Bus,
  dining: Coffee,
  other: Gallery,
}

// Inline SVG paths for Leaflet custom HTML markers
export const GROUP_SVG_PATHS: Record<string, string> = {
  shopping: `<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />`,
  education: `<path d="M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c0 2 6 2 6 2s6 0 6-2v-5" />`,
  parks: `<path d="M12 2L5 13h4v8h6v-8h4z" />`,
  health: `<path d="M12 5v14M5 12h14" />`,
  transit: `<path d="M4 16l4 4M20 16l-4 4M19 13V6a2 2 0 00-2-2H7a2 2 0 00-2 2v7m14 0H5" /><circle cx="7.5" cy="10.5" r="1.2" fill="currentColor"/><circle cx="16.5" cy="10.5" r="1.2" fill="currentColor"/>`,
  dining: `<path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />`,
  other: `<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />`,
}

const COLOR_BY_KEY = new Map(NEARBY_GROUPS.map((g) => [g.key, g.color]))

export function groupColor(key: string): string {
  return COLOR_BY_KEY.get(key) ?? '#64748B'
}

/** Legend chips — icon badge + label + count; toggling hides that group on map & radar */
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
    <div dir="rtl" className="mt-3.5 flex flex-wrap justify-center gap-2">
      {groups.map((g) => {
        const off = hidden.has(g.key)
        const IconCmp = GROUP_ICONS[g.key] || Gallery
        return (
          <button
            key={g.key}
            type="button"
            onClick={() => onToggle(g.key)}
            aria-pressed={!off}
            className={`flex items-center gap-2 rounded-full border border-border-app bg-white px-3.5 py-1.5 text-[12.5px] font-extrabold text-navy transition hover:bg-slate-50 card-shadow ${
              off ? 'opacity-40 grayscale' : ''
            }`}
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white shadow-xs"
              style={{ backgroundColor: g.color }}
            >
              <IconCmp size={11} color="#ffffff" variant="Bold" />
            </span>
            <span>{g.label}</span>
            <span className="font-extrabold text-secondary-text">{g.count}</span>
          </button>
        )
      })}
    </div>
  )
}

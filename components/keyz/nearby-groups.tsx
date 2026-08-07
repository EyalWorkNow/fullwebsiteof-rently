'use client'

import React from 'react'
import {
  Bag,
  Briefcase,
  Building3,
  Buildings,
  Bus,
  Car,
  Coffee,
  Drop,
  EmojiHappy,
  Gallery,
  Game,
  Health,
  Heart,
  Hospital,
  Moon,
  Pet,
  Reserve,
  Routing,
  Routing2,
  ShoppingCart,
  Teacher,
  Tree,
  Weight,
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

// Complete palette & icon mappings for all 22 categories
export const CATEGORY_META: Record<string, { label: string; color: string; icon: Icon; svgPath: string }> = {
  schools: {
    label: 'בתי ספר',
    color: '#7C3AED',
    icon: Teacher,
    svgPath: `<path d="M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c0 2 6 2 6 2s6 0 6-2v-5" />`,
  },
  kindergartens: {
    label: 'גני ילדים',
    color: '#9333EA',
    icon: EmojiHappy,
    svgPath: `<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>`,
  },
  health: {
    label: 'שירותי בריאות',
    color: '#E11D48',
    icon: Hospital,
    svgPath: `<path d="M12 5v14M5 12h14" />`,
  },
  pharmacies: {
    label: 'בתי מרקחת',
    color: '#F43F5E',
    icon: Health,
    svgPath: `<path d="M12 5v14M5 12h14" />`,
  },
  vets: {
    label: 'וטרינרים',
    color: '#FB7185',
    icon: Heart,
    svgPath: `<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 000-7.84z"/>`,
  },
  supermarkets: {
    label: 'סופרים',
    color: '#2563EB',
    icon: ShoppingCart,
    svgPath: `<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />`,
  },
  poi_retail: {
    label: 'קניונים וסחר',
    color: '#3B82F6',
    icon: Bag,
    svgPath: `<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18" />`,
  },
  parks: {
    label: 'פארקים',
    color: '#15803D',
    icon: Tree,
    svgPath: `<path d="M12 2L5 13h4v8h6v-8h4z" />`,
  },
  playgrounds: {
    label: 'גני שעשועים',
    color: '#16A34A',
    icon: Game,
    svgPath: `<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M15 11h2M16 10v2"/>`,
  },
  pools: {
    label: 'בריכות שחייה',
    color: '#0EA5E9',
    icon: Drop,
    svgPath: `<path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>`,
  },
  dog_parks: {
    label: 'גני כלבים',
    color: '#22C55E',
    icon: Pet,
    svgPath: `<circle cx="12" cy="12" r="4"/><circle cx="6" cy="7" r="2"/><circle cx="18" cy="7" r="2"/>`,
  },
  transit: {
    label: 'תחבורה ציבורית',
    color: '#072946',
    icon: Bus,
    svgPath: `<path d="M4 16l4 4M20 16l-4 4M19 13V6a2 2 0 00-2-2H7a2 2 0 00-2 2v7m14 0H5" />`,
  },
  parking: {
    label: 'חניה ציבורית',
    color: '#1E293B',
    icon: Car,
    svgPath: `<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 17V7h4a3 3 0 010 6H9"/>`,
  },
  bike_share: {
    label: 'אופניים משותפים',
    color: '#0284C7',
    icon: Routing2,
    svgPath: `<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 100-2 1 1 0 000 2zm-3 5.5l-3-4H4m8 4l2.5 6m0 0l-3.5-6.5"/>`,
  },
  future_infra: {
    label: 'תשתיות עתידיות',
    color: '#4F46E5',
    icon: Routing,
    svgPath: `<path d="M3 17l6-6 4 4 8-8M14 7h7v7"/>`,
  },
  dining: {
    label: 'אוכל וקפה',
    color: '#C2410C',
    icon: Reserve,
    svgPath: `<path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />`,
  },
  nightlife_venues: {
    label: 'חיי לילה',
    color: '#EA580C',
    icon: Moon,
    svgPath: `<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>`,
  },
  worship: {
    label: 'בתי כנסת ותפילה',
    color: '#475569',
    icon: Buildings,
    svgPath: `<path d="M12 2L2 7v13h20V7L12 2zM12 9a3 3 0 100 6 3 3 0 000-6z"/>`,
  },
  synagogues: {
    label: 'בתי כנסת',
    color: '#334155',
    icon: Building3,
    svgPath: `<path d="M12 2L2 7v13h20V7L12 2z"/>`,
  },
  culture: {
    label: 'תרבות ופנאי',
    color: '#64748B',
    icon: Gallery,
    svgPath: `<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />`,
  },
  gyms: {
    label: 'חדרי כושר',
    color: '#D97706',
    icon: Weight,
    svgPath: `<path d="M6.5 6.5h11M6.5 17.5h11M6 9v6M18 9v6M3 10.5v3M21 10.5v3"/>`,
  },
  coworking: {
    label: 'חללי עבודה',
    color: '#0284C7',
    icon: Briefcase,
    svgPath: `<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>`,
  },
}

export function groupColor(key: string): string {
  return CATEGORY_META[key]?.color ?? '#64748B'
}

export function groupSvgPath(key: string): string {
  return CATEGORY_META[key]?.svgPath ?? CATEGORY_META.culture.svgPath
}

export function groupIcon(key: string): Icon {
  return CATEGORY_META[key]?.icon ?? Gallery
}

/** Legend chips — icon badge + label + count; toggling hides that specific category layer on map & radar */
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
        const IconCmp = groupIcon(g.key)
        const meta = CATEGORY_META[g.key]
        const color = meta?.color ?? g.color
        const label = meta?.label ?? g.label

        return (
          <button
            key={g.key}
            type="button"
            onClick={() => onToggle(g.key)}
            aria-pressed={!off}
            className={`flex items-center gap-2 rounded-full border border-border-app bg-white px-3 py-1.5 text-[12px] font-extrabold text-navy transition hover:bg-slate-50 card-shadow ${
              off ? 'opacity-35 grayscale' : ''
            }`}
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white shadow-xs"
              style={{ backgroundColor: color }}
            >
              <IconCmp size={11} color="#ffffff" variant="Bold" />
            </span>
            <span>{label}</span>
            <span className="font-extrabold text-secondary-text">{g.count}</span>
          </button>
        )
      })}
    </div>
  )
}

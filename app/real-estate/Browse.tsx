'use client'

// Apartments search page — 2-column desktop layout:
//   RIGHT (RTL start): top bar + full app-ported filter sidebar + card grid
//   LEFT:              sticky MapPanel (built by the search-map module)
// Filtering runs client-side over fetchProperties(500) with the app's exact
// hard-filter semantics (see ./filters.ts).

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import { Building, CloseCircle, Filter, Map1, SearchNormal1 } from 'iconsax-react'
import PropertyCard from '@/components/keyz/PropertyCard'
import { fetchProperties } from '@/lib/live/api'
import type { Property } from '@/lib/live/types'
import FilterSidebar from './FilterSidebar'
import {
  SORT_OPTIONS,
  type SortOption,
  type WebFilters,
  activeFilterCount,
  applyFilters,
  defaultFilters,
  loadStoredFilters,
  storeFilters,
} from './filters'

// Contract with the search-map module (built in parallel — import, don't create).
interface MapPanelProps {
  items: Property[]
  visibleIds: Set<string>
  onLassoChange: (ids: Set<string> | null) => void
}

const MapPanel = dynamic(() => import('@/components/keyz/search-map/MapPanel'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-[28px] bg-cloud" />,
}) as ComponentType<MapPanelProps>

export default function Browse() {
  const [items, setItems] = useState<Property[]>([])
  const [live, setLive] = useState(true)
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState<WebFilters>(() => defaultFilters())
  const hydratedRef = useRef(false)

  const [lassoIds, setLassoIds] = useState<Set<string> | null>(null)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [showMobileMap, setShowMobileMap] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchProperties(500).then(({ items, live }) => {
      if (cancelled) return
      setItems(items)
      setLive(live)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Restore persisted filters once on mount (after hydration — avoids SSR
  // markup mismatch), then persist every change.
  useEffect(() => {
    const stored = loadStoredFilters()
    if (stored) setFilters(stored)
    hydratedRef.current = true
  }, [])

  useEffect(() => {
    if (hydratedRef.current) storeFilters(filters)
  }, [filters])

  const setAndKeep = (next: WebFilters) => setFilters(next)
  const clearAll = () => setFilters(defaultFilters())

  const filtered = useMemo(() => applyFilters(items, filters), [items, filters])

  // Final visible list = filter results ∩ lasso selection (when active).
  const visible = useMemo(
    () => (lassoIds === null ? filtered : filtered.filter((p) => lassoIds.has(p.id))),
    [filtered, lassoIds],
  )
  const visibleIds = useMemo(() => new Set(visible.map((p) => p.id)), [visible])

  const activeCount = activeFilterCount(filters)

  const grid = loading ? (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-[360px] animate-pulse rounded-[28px] bg-cloud" />
      ))}
    </div>
  ) : visible.length === 0 ? (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-border-app bg-white py-16 text-center card-shadow">
      <Building size={40} color="#5B7A99" />
      <p className="text-[15px] font-bold text-secondary-text">לא מצאנו דירות שמתאימות לסינון</p>
      <button
        type="button"
        onClick={() => {
          clearAll()
          setLassoIds(null)
        }}
        className="rounded-full bg-primary px-5 py-2.5 font-bold text-white"
      >
        נקה סינון
      </button>
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {visible.map((p) => (
        <a key={p.id} href={`/listing/${p.id}`} className="block [&>[role=button]]:w-full">
          <PropertyCard property={p} />
        </a>
      ))}
    </div>
  )

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-5 px-4 pt-28 pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(380px,44%)]">
      {/* ── RIGHT column (RTL start): top bar + sidebar + grid ── */}
      <div className="min-w-0">
        {/* Top bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-3xl border border-border-app bg-white/90 p-3 backdrop-blur card-shadow">
          <label className="flex min-w-[160px] flex-1 items-center gap-2 rounded-full bg-cloud px-4 py-2.5">
            <SearchNormal1 size={16} color="#5B7A99" />
            <input
              type="text"
              value={filters.query}
              onChange={(e) => setAndKeep({ ...filters, query: e.target.value })}
              placeholder="עיר, שכונה או רחוב…"
              className="w-full bg-transparent text-[14px] font-semibold text-navy outline-none placeholder:text-secondary-text"
            />
          </label>

          <select
            value={filters.sortBy}
            onChange={(e) => setAndKeep({ ...filters, sortBy: e.target.value as SortOption })}
            aria-label="מיון"
            className="rounded-full border-0 bg-cloud px-4 py-2.5 text-[13px] font-bold text-navy"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Mobile: opens the filter slide-over */}
          <button
            type="button"
            onClick={() => setShowMobileFilters(true)}
            className="relative flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-[13px] font-bold text-white lg:hidden"
          >
            <Filter size={15} color="#FFFFFF" />
            סינון
            {activeCount > 0 && (
              <span className="absolute -top-1.5 -left-1.5 min-w-5 rounded-full bg-coral px-1.5 py-0.5 text-center text-[11px] font-black leading-none text-white">
                {activeCount}
              </span>
            )}
          </button>

          {(activeCount > 0 || lassoIds !== null) && (
            <button
              type="button"
              onClick={() => {
                clearAll()
                setLassoIds(null)
              }}
              className="text-[13px] font-bold text-secondary-text transition hover:text-coral"
            >
              נקה הכל
            </button>
          )}
        </div>

        {/* Result count + badges */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {!loading && (
            <p className="text-[14px] font-bold text-secondary-text">נמצאו {visible.length} דירות</p>
          )}
          {!live && !loading && (
            <span className="rounded-full bg-[#FEF3C7] px-3 py-1 text-[12px] font-bold text-[#C2410C]">
              נתוני דוגמה
            </span>
          )}
          {lassoIds !== null && (
            <button
              type="button"
              onClick={() => setLassoIds(null)}
              className="flex items-center gap-1 rounded-full bg-primary-light2 px-3 py-1 text-[12px] font-bold text-primary transition hover:bg-primary hover:text-white"
            >
              סינון לפי אזור מסומן ✕
            </button>
          )}
        </div>

        {/* Inner split: sidebar 300px | card grid (the cleaner option — the
            sidebar stays visible while scrolling results, portal-style). */}
        <div className="flex items-start gap-5">
          <aside className="no-scrollbar sticky top-24 hidden max-h-[calc(100vh-120px)] w-[300px] shrink-0 self-start overflow-y-auto lg:block">
            <FilterSidebar items={items} filters={filters} onChange={setAndKeep} onClear={clearAll} />
          </aside>
          <div className="min-w-0 flex-1">{grid}</div>
        </div>
      </div>

      {/* ── LEFT column: sticky map ── */}
      <div className="hidden lg:block">
        <div className="sticky top-24 h-[calc(100vh-120px)] self-start overflow-hidden rounded-[28px] border border-border-app card-shadow">
          <MapPanel items={filtered} visibleIds={visibleIds} onLassoChange={setLassoIds} />
        </div>
      </div>

      {/* ── Mobile: filter slide-over ── */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="סגור סינון"
            onClick={() => setShowMobileFilters(false)}
            className="absolute inset-0 bg-navy/40"
          />
          <div className="no-scrollbar absolute inset-y-0 right-0 w-[88%] max-w-[380px] overflow-y-auto bg-cloud p-3">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                aria-label="סגירה"
                onClick={() => setShowMobileFilters(false)}
                className="rounded-full bg-white p-2 card-shadow"
              >
                <CloseCircle size={20} color="#072946" />
              </button>
            </div>
            <FilterSidebar items={items} filters={filters} onChange={setAndKeep} onClear={clearAll} />
            <button
              type="button"
              onClick={() => setShowMobileFilters(false)}
              className="mt-3 w-full rounded-full bg-primary px-5 py-3 text-[15px] font-black text-white"
            >
              הצג {visible.length} דירות
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile: floating map toggle + full-screen overlay ── */}
      {!showMobileMap && (
        <button
          type="button"
          onClick={() => setShowMobileMap(true)}
          className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-6 py-3 text-[14px] font-black text-white card-shadow lg:hidden"
        >
          <Map1 size={17} color="#FFFFFF" />
          מפה
        </button>
      )}
      {showMobileMap && (
        <div className="fixed inset-0 z-[80] bg-white lg:hidden">
          <MapPanel items={filtered} visibleIds={visibleIds} onLassoChange={setLassoIds} />
          <button
            type="button"
            onClick={() => setShowMobileMap(false)}
            className="absolute top-4 right-4 z-[81] flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-[13px] font-black text-navy card-shadow"
          >
            <CloseCircle size={16} color="#072946" />
            סגירה
          </button>
        </div>
      )}
    </div>
  )
}

'use client'

// Apartments search page — 2-column desktop layout:
//   RIGHT (RTL start): control bar + collapsible filter panel + results
//   LEFT:              sticky MapPanel (built by the search-map module)
// Filtering runs client-side over fetchProperties(500) with the app's exact
// hard-filter semantics (see ./filters.ts).
//
// The page opens on RESULTS, not controls: the heavy filter sections live in a
// panel that is collapsed by default at every breakpoint. Only the two everyday
// controls (free text + sort) stay in the always-visible bar, and whatever is
// currently narrowing the list is shown as removable chips — so a collapsed
// panel never hides an active filter.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import { ArrowDown2, Building, CloseCircle, Filter, Map1, SearchNormal1 } from 'iconsax-react'
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
  describeActiveFilters,
  loadPanelOpen,
  loadStoredFilters,
  storeFilters,
  storePanelOpen,
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

const QUERY_DEBOUNCE_MS = 250

export default function Browse() {
  const [items, setItems] = useState<Property[]>([])
  const [live, setLive] = useState(true)
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState<WebFilters>(() => defaultFilters())
  const [hydrated, setHydrated] = useState(false)
  // Collapsed on first paint (and on the server) so the markup matches; the
  // stored preference is applied right after hydration.
  const [panelOpen, setPanelOpen] = useState(false)

  // The text box is uncontrolled by `filters` so typing stays at 60fps: the
  // committed query lands in `filters` only after the user pauses. Re-filtering
  // + re-sorting 500 rows and re-rendering the whole grid on every keystroke
  // was the one real perf hole on this page.
  const [queryInput, setQueryInput] = useState('')
  const queryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [lassoIds, setLassoIds] = useState<Set<string> | null>(null)
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

  // Restore persisted state once on mount (after hydration — avoids SSR markup
  // mismatch), then persist every change.
  useEffect(() => {
    const stored = loadStoredFilters()
    if (stored) {
      setFilters(stored)
      setQueryInput(stored.query)
    }
    setPanelOpen(loadPanelOpen())
    setHydrated(true)
  }, [])

  // `hydrated` is state, not a ref: with a ref this effect ran in the SAME
  // commit as the restore above (ref already true, `filters` still the default)
  // and wrote the defaults straight over the stored value before the restored
  // state landed.
  useEffect(() => {
    if (hydrated) storeFilters(filters)
  }, [filters, hydrated])

  useEffect(() => {
    if (hydrated) storePanelOpen(panelOpen)
  }, [panelOpen, hydrated])

  useEffect(() => {
    return () => {
      if (queryTimer.current) clearTimeout(queryTimer.current)
    }
  }, [])

  const setAndKeep = useCallback((next: WebFilters) => {
    setFilters(next)
    setQueryInput(next.query)
  }, [])

  const commitQuery = useCallback((value: string) => {
    setQueryInput(value)
    if (queryTimer.current) clearTimeout(queryTimer.current)
    queryTimer.current = setTimeout(() => {
      setFilters((prev) => (prev.query === value ? prev : { ...prev, query: value }))
    }, QUERY_DEBOUNCE_MS)
  }, [])

  const clearAll = useCallback(() => {
    if (queryTimer.current) clearTimeout(queryTimer.current)
    setFilters(defaultFilters())
    setQueryInput('')
  }, [])

  const filtered = useMemo(() => applyFilters(items, filters), [items, filters])

  // Final visible list = filter results ∩ lasso selection (when active).
  const visible = useMemo(
    () => (lassoIds === null ? filtered : filtered.filter((p) => lassoIds.has(p.id))),
    [filtered, lassoIds],
  )
  const visibleIds = useMemo(() => new Set(visible.map((p) => p.id)), [visible])

  const activeCount = activeFilterCount(filters)
  const activeChips = useMemo(() => describeActiveFilters(filters), [filters])
  // The query is still settling — say so rather than showing a stale count.
  const queryPending = queryInput.trim() !== filters.query.trim()

  const grid = loading ? (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
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
    // Same card as the home page (PropertyCard); its root is a fixed-width
    // carousel item, so stretch it to the grid cell. auto-fill sizes columns
    // from the ACTUAL column width — no breakpoint guessing when the filter
    // panel opens/closes or the map column changes the available space.
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] items-start gap-5">
      {visible.map((p) => (
        <a
          key={p.id}
          href={`/listing/${p.id}`}
          className="block [&>[role=button]]:w-full"
        >
          <PropertyCard property={p} />
        </a>
      ))}
    </div>
  )

  return (
    // NOTE: no `items-start` here — the map column must STRETCH to the row
    // height, otherwise its sticky child has no travel room and scrolls away.
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-5 px-4 pt-28 pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(360px,38%)]">
      {/* ── RIGHT column (RTL start): control bar + panel + results ── */}
      <div className="min-w-0">
        {/* Always-visible control bar */}
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-3xl border border-border-app bg-white/90 p-3 backdrop-blur card-shadow">
          <label className="flex min-w-[160px] flex-1 items-center gap-2 rounded-full bg-cloud px-4 py-2.5">
            <SearchNormal1 size={16} color="#5B7A99" />
            <input
              type="search"
              value={queryInput}
              onChange={(e) => commitQuery(e.target.value)}
              placeholder="עיר, שכונה, רחוב או מאפיין…"
              aria-label="חיפוש חופשי"
              className="w-full bg-transparent text-[14px] font-semibold text-navy outline-none placeholder:text-secondary-text"
            />
            {queryInput && (
              <button type="button" aria-label="נקה חיפוש" onClick={() => commitQuery('')}>
                <CloseCircle size={16} color="#5B7A99" />
              </button>
            )}
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

          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
            aria-controls="filters-panel"
            className={`relative flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-bold transition ${
              panelOpen ? 'bg-navy text-white' : 'bg-primary text-white'
            }`}
          >
            <Filter size={15} color="#FFFFFF" />
            סינון ומיון
            <ArrowDown2
              size={14}
              color="#FFFFFF"
              className={`transition-transform duration-300 ${panelOpen ? 'rotate-180' : ''}`}
            />
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

        {/* Collapsible filter panel. The grid-rows 0fr→1fr trick animates to the
            content's natural height without hard-coding a max-height, and it
            lives inside the results column so expanding never reflows the map. */}
        <div
          id="filters-panel"
          className={`grid transition-all duration-300 ease-out ${
            panelOpen ? 'mb-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
          aria-hidden={!panelOpen}
        >
          <div className="overflow-hidden">
            {/* Kept mounted so the collapse animates and facet state persists;
                inert while closed so nothing inside is tabbable. */}
            <fieldset disabled={!panelOpen} className="min-w-0 border-0 p-0">
              <FilterSidebar
                items={items}
                filters={filters}
                onChange={setAndKeep}
                onClear={clearAll}
                footer={
                  <button
                    type="button"
                    onClick={() => setPanelOpen(false)}
                    className="rounded-full bg-primary px-5 py-2.5 text-[13px] font-black text-white"
                  >
                    הצג {visible.length} דירות
                  </button>
                }
              />
            </fieldset>
          </div>
        </div>

        {/* Result count + badges */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {!loading && (
            <p className="text-[14px] font-bold text-secondary-text" aria-live="polite">
              {queryPending ? 'מחפש…' : `נמצאו ${visible.length} דירות`}
            </p>
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

        {/* Active-filter summary — every active filter as its own removable
            chip, so a collapsed panel never hides what is narrowing the list. */}
        {activeChips.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {activeChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setAndKeep(chip.clear(filters))}
                aria-label={`הסר סינון ${chip.label}`}
                className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-light2 px-3 py-1 text-[12px] font-bold text-primary transition hover:border-coral hover:bg-white hover:text-coral"
              >
                {chip.label}
                <span aria-hidden>✕</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                clearAll()
                setLassoIds(null)
              }}
              className="px-2 text-[12px] font-bold text-secondary-text transition hover:text-coral"
            >
              נקה הכל
            </button>
          </div>
        )}

        {grid}
      </div>

      {/* ── LEFT column: sticky map ── */}
      <div className="hidden lg:block">
        <div className="sticky top-24 h-[calc(100vh-120px)] self-start overflow-hidden rounded-[28px] border border-border-app card-shadow">
          <MapPanel items={filtered} visibleIds={visibleIds} onLassoChange={setLassoIds} />
        </div>
      </div>

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

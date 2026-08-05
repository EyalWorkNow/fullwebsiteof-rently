'use client'

import { useEffect, useMemo, useState } from 'react'
import { Building, SearchNormal1 } from 'iconsax-react'
import PropertyCard from '@/components/keyz/PropertyCard'
import { fetchProperties } from '@/lib/live/api'
import type { Property } from '@/lib/live/types'

type TypeFilter = 'all' | 'rent' | 'sale'
type Sort = 'new' | 'priceAsc' | 'priceDesc'

const RENT_PRICES: { value: number; label: string }[] = [
  { value: 0, label: 'כל מחיר' },
  { value: 4000, label: 'עד 4,000 ₪' },
  { value: 6000, label: 'עד 6,000 ₪' },
  { value: 8000, label: 'עד 8,000 ₪' },
  { value: 12000, label: 'עד 12,000 ₪' },
  { value: 20000, label: 'עד 20,000 ₪' },
]

const SALE_PRICES: { value: number; label: string }[] = [
  { value: 0, label: 'כל מחיר' },
  { value: 1_500_000, label: 'עד 1.5 מיליון ₪' },
  { value: 2_500_000, label: 'עד 2.5 מיליון ₪' },
  { value: 4_000_000, label: 'עד 4 מיליון ₪' },
  { value: 6_000_000, label: 'עד 6 מיליון ₪' },
]

const ROOM_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'כל מספר חדרים' },
  { value: 2, label: '2+ חדרים' },
  { value: 3, label: '3+ חדרים' },
  { value: 4, label: '4+ חדרים' },
  { value: 5, label: '5+ חדרים' },
]

export default function Browse() {
  const [items, setItems] = useState<Property[]>([])
  const [live, setLive] = useState(true)
  const [loading, setLoading] = useState(true)

  const [q, setQ] = useState('')
  const [type, setType] = useState<TypeFilter>('all')
  const [minRooms, setMinRooms] = useState(0)
  const [maxPrice, setMaxPrice] = useState(0)
  const [sort, setSort] = useState<Sort>('new')

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

  const priceOptions = type === 'sale' ? SALE_PRICES : RENT_PRICES

  const hasFilter = q.trim() !== '' || type !== 'all' || minRooms !== 0 || maxPrice !== 0 || sort !== 'new'

  const clearAll = () => {
    setQ('')
    setType('all')
    setMinRooms(0)
    setMaxPrice(0)
    setSort('new')
  }

  const setTypeAndResetPrice = (t: TypeFilter) => {
    setType(t)
    setMaxPrice(0) // rent/sale price scales differ — reset on switch
  }

  const filtered = useMemo(() => {
    const needle = q.trim()
    const out = items.filter((p) => {
      if (needle) {
        const hay = `${p.city ?? ''} ${p.neighborhood ?? ''} ${p.street ?? ''}`
        if (!hay.includes(needle)) return false
      }
      if (type !== 'all') {
        const t = p.transactionType === 'sale' ? 'sale' : 'rent'
        if (t !== type) return false
      }
      if (minRooms > 0 && !(p.rooms >= minRooms)) return false
      if (maxPrice > 0 && !(p.price <= maxPrice)) return false
      return true
    })
    if (sort === 'priceAsc') out.sort((a, b) => a.price - b.price)
    else if (sort === 'priceDesc') out.sort((a, b) => b.price - a.price)
    return out // 'new' keeps API order
  }, [items, q, type, minRooms, maxPrice, sort])

  return (
    <div className="mx-auto max-w-[1200px] px-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black text-navy md:text-4xl">דירות בכל הארץ</h1>
          {!live && (
            <span className="rounded-full bg-[#FEF3C7] px-3 py-1 text-[12px] font-bold text-[#C2410C]">
              נתוני דוגמה
            </span>
          )}
        </div>
        <p className="mt-2 text-secondary-text">
          כל הדירות הפעילות ברנטלי — מתעדכן ישירות מהאפליקציה
        </p>
      </div>

      {/* Filter bar */}
      <div className="sticky top-[72px] z-30 flex flex-wrap items-center gap-2 rounded-3xl border border-border-app bg-white/90 p-3 backdrop-blur card-shadow">
        <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-full bg-cloud px-4 py-2.5">
          <SearchNormal1 size={16} color="#5B7A99" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="עיר, שכונה או רחוב…"
            className="w-full bg-transparent text-[14px] font-semibold text-navy outline-none placeholder:text-secondary-text"
          />
        </label>

        <div className="flex items-center gap-1">
          {(
            [
              ['all', 'הכל'],
              ['rent', 'השכרה'],
              ['sale', 'מכירה'],
            ] as [TypeFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTypeAndResetPrice(value)}
              className={`rounded-full px-4 py-2 text-[13px] font-bold transition ${
                type === value ? 'bg-primary text-white' : 'bg-cloud text-navy'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={minRooms}
          onChange={(e) => setMinRooms(Number(e.target.value))}
          aria-label="מספר חדרים"
          className="rounded-full border-0 bg-cloud px-4 py-2.5 text-[13px] font-bold text-navy"
        >
          {ROOM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          aria-label="מחיר מקסימלי"
          className="rounded-full border-0 bg-cloud px-4 py-2.5 text-[13px] font-bold text-navy"
        >
          {priceOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="מיון"
          className="rounded-full border-0 bg-cloud px-4 py-2.5 text-[13px] font-bold text-navy"
        >
          <option value="new">החדשות ביותר</option>
          <option value="priceAsc">מחיר: מהזול</option>
          <option value="priceDesc">מחיר: מהיקר</option>
        </select>

        {hasFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[13px] font-bold text-secondary-text transition hover:text-coral"
          >
            נקה הכל
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[360px] animate-pulse rounded-[28px] bg-cloud" />
          ))}
        </div>
      ) : (
        <>
          <p className="my-4 text-[14px] font-bold text-secondary-text">
            נמצאו {filtered.length} דירות
          </p>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <Building size={40} color="#5B7A99" />
              <p className="text-[15px] font-bold text-secondary-text">
                לא מצאנו דירות שמתאימות לסינון
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-full bg-primary px-5 py-2.5 font-bold text-white"
              >
                נקה סינון
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <a key={p.id} href={`/listing/${p.id}`} className="block [&>[role=button]]:w-full">
                  <PropertyCard property={p} />
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft2, ArrowRight2 } from 'iconsax-react'
import { fetchProperties } from '@/lib/live/api'
import type { Property } from '@/lib/live/types'
import PropertyCard from './PropertyCard'

function Row({ title, items, live }: { title: string; items: Property[]; live: boolean }) {
  const track = useRef<HTMLDivElement>(null)

  // RTL: content advances toward negative scrollLeft, so "forward" is -720.
  const scroll = (forward: boolean) =>
    track.current?.scrollBy({ left: forward ? -720 : 720, behavior: 'smooth' })

  if (!items.length) return null

  return (
    <div className="mb-10 last:mb-0">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black text-navy">{title}</h2>
          {!live && (
            <span className="rounded-full bg-[#FEF3C7] px-3 py-1 text-[12px] font-bold text-[#C2410C]">
              נתוני דוגמה
            </span>
          )}
        </div>
        <div className="hidden gap-2 md:flex">
          <button
            type="button"
            aria-label="הקודם"
            onClick={() => scroll(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border-app bg-white badge-shadow"
          >
            <ArrowRight2 size={18} color="#072946" />
          </button>
          <button
            type="button"
            aria-label="הבא"
            onClick={() => scroll(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border-app bg-white badge-shadow"
          >
            <ArrowLeft2 size={18} color="#072946" />
          </button>
        </div>
      </div>
      <div ref={track} className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-2">
        {items.map((p) => (
          <div key={p.id} className="snap-start">
            <a href={`/listing/${p.id}`} className="block">
              <PropertyCard property={p} />
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="mb-10 flex gap-4 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[340px] w-[340px] shrink-0 animate-pulse rounded-[28px] bg-cloud" />
      ))}
    </div>
  )
}

export default function ListingRows() {
  const [items, setItems] = useState<Property[]>([])
  const [live, setLive] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchProperties(60).then((r) => {
      if (cancelled) return
      setItems(r.items)
      setLive(r.live)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const row1 = items.slice(0, 12)
  const row1Ids = new Set(row1.map((p) => p.id))
  const rentals = items.filter((p) => p.transactionType !== 'sale')
  // Prefer rentals not already shown in row 1, then top up if the pool is thin.
  const row2 = [
    ...rentals.filter((p) => !row1Ids.has(p.id)),
    ...rentals.filter((p) => row1Ids.has(p.id)),
  ].slice(0, 12)
  const row3 = items.filter((p) => p.transactionType === 'sale').slice(0, 12)

  return (
    <section id="listings" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-12">
      {loading ? (
        <>
          <SkeletonRow />
          <SkeletonRow />
        </>
      ) : (
        <>
          <Row title="חדשות עכשיו ברנטלי" items={row1} live={live} />
          <Row title="דירות להשכרה" items={row2} live={live} />
          <Row title="דירות למכירה" items={row3} live={live} />
        </>
      )}
    </section>
  )
}

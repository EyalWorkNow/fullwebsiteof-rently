'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft2, ArrowRight2 } from 'iconsax-react'
import { fetchProperties } from '@/lib/live/api'
import type { Property } from '@/lib/live/types'
import PropertyCard from './PropertyCard'
import PropertyPreviewModal from './PropertyPreviewModal'

function Row({
  title,
  items,
  live,
  onSelectProperty,
}: {
  title: string
  items: Property[]
  live: boolean
  onSelectProperty: (p: Property) => void
}) {
  const track = useRef<HTMLDivElement>(null)

  // RTL: scroll by 1 card width + gap (384px card + 16px gap = 400px)
  const scroll = (forward: boolean) => {
    if (!track.current) return
    const firstCard = track.current.firstElementChild as HTMLElement | null
    const cardStep = firstCard ? firstCard.offsetWidth + 16 : 400
    track.current.scrollBy({ left: forward ? -cardStep : cardStep, behavior: 'smooth' })
  }

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
      </div>

      <div className="relative group px-0 sm:px-14">
        {/* Previous Button (Right Side in RTL) */}
        <button
          type="button"
          aria-label="הקודם"
          onClick={() => scroll(false)}
          className="absolute right-0 top-1/2 z-20 -translate-y-1/2 hidden md:flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md transition-all hover:bg-slate-50 hover:scale-110 active:scale-95 hover:shadow-lg text-navy"
        >
          <ArrowRight2 size={20} color="#072946" />
        </button>

        {/* Next Button (Left Side in RTL) */}
        <button
          type="button"
          aria-label="הבא"
          onClick={() => scroll(true)}
          className="absolute left-0 top-1/2 z-20 -translate-y-1/2 hidden md:flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md transition-all hover:bg-slate-50 hover:scale-110 active:scale-95 hover:shadow-lg text-navy"
        >
          <ArrowLeft2 size={20} color="#072946" />
        </button>

        <div ref={track} className="no-scrollbar flex snap-x snap-mandatory gap-3.5 sm:gap-4 overflow-x-auto py-2 px-0 scroll-smooth">
          {items.map((p) => (
            <div key={p.id} className="w-[88vw] sm:w-[calc((100%-16px)/2)] md:w-[calc((100%-32px)/3)] max-w-[360px] shrink-0 snap-start">
              <PropertyCard property={p} onSelect={() => onSelectProperty(p)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="mb-10 flex gap-4 overflow-hidden px-10 sm:px-14">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[340px] w-[calc((100%-32px)/3)] shrink-0 animate-pulse rounded-[28px] bg-cloud" />
      ))}
    </div>
  )
}

export default function ListingRows() {
  const [items, setItems] = useState<Property[]>([])
  const [live, setLive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [previewProperty, setPreviewProperty] = useState<Property | null>(null)

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
          <Row title="חדשות עכשיו ברנטלי" items={row1} live={live} onSelectProperty={setPreviewProperty} />
          <Row title="דירות להשכרה" items={row2} live={live} onSelectProperty={setPreviewProperty} />
          <Row title="דירות למכירה" items={row3} live={live} onSelectProperty={setPreviewProperty} />
        </>
      )}

      {/* Floating Property Preview Modal */}
      <PropertyPreviewModal
        property={previewProperty}
        allProperties={items}
        onClose={() => setPreviewProperty(null)}
        onSelectProperty={(p) => setPreviewProperty(p)}
      />
    </section>
  )
}

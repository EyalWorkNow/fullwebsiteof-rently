'use client'

import React, { useRef, useState, useEffect } from 'react'
import { ArrowLeft2, ArrowRight2 } from 'iconsax-react'
import PropertyCard from './PropertyCard'
import type { Property } from '@/lib/live/types'

interface ListingCarouselProps {
  listings: Property[]
  notes?: Record<string, string>
  explanations?: Record<string, string>
  className?: string
}

export default function ListingCarousel({
  listings,
  notes,
  explanations,
  className = '',
}: ListingCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = () => {
    const el = containerRef.current
    if (!el) return
    // In RTL layout, scrollLeft can be negative or positive depending on browser implementation.
    const maxScroll = el.scrollWidth - el.clientWidth
    const currentScroll = Math.abs(el.scrollLeft)

    setCanScrollLeft(currentScroll > 10)
    setCanScrollRight(maxScroll - currentScroll > 10)
  }

  useEffect(() => {
    checkScroll()
    const el = containerRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [listings])

  const scrollByAmount = (direction: 'left' | 'right') => {
    const el = containerRef.current
    if (!el) return
    const cardWidth = 270
    // In RTL, scrolling right goes towards 0 (start), scrolling left goes towards maxScroll (end).
    const scrollOffset = direction === 'left' ? -cardWidth : cardWidth
    el.scrollBy({ left: scrollOffset, behavior: 'smooth' })
  }

  if (!listings || listings.length === 0) return null

  return (
    <div className={`relative group/carousel w-full ${className}`}>
      {/* Scroll Left Button */}
      <button
        type="button"
        aria-label="גלול שמאלה"
        onClick={() => scrollByAmount('left')}
        className={`absolute -left-3.5 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white text-navy shadow-md backdrop-blur-md transition-all duration-200 hover:bg-[#0061FF] hover:text-white hover:border-[#0061FF] hover:scale-110 active:scale-95 cursor-pointer ${
          canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <ArrowLeft2 size={18} color="currentColor" />
      </button>

      {/* Scroll Right Button */}
      <button
        type="button"
        aria-label="גלול ימינה"
        onClick={() => scrollByAmount('right')}
        className={`absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white text-navy shadow-md backdrop-blur-md transition-all duration-200 hover:bg-[#0061FF] hover:text-white hover:border-[#0061FF] hover:scale-110 active:scale-95 cursor-pointer ${
          canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <ArrowRight2 size={18} color="currentColor" />
      </button>

      {/* Carousel Container — Fits exactly 3 cards side-by-side */}
      <div
        ref={containerRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto py-2.5 px-0.5 scroll-smooth w-full"
      >
        {listings.map((p) => (
          <div key={p.id} className="snap-start shrink-0">
            <a href={`/listing/${p.id}`} className="block">
              <PropertyCard property={p} />
            </a>
            {(notes?.[p.id] || explanations?.[p.id]) && (
              <p className="mt-2 max-w-[260px] text-[12px] font-semibold leading-relaxed text-slate-600 bg-blue-50/70 border border-blue-100/80 rounded-xl px-3 py-1.5">
                {notes?.[p.id] && (
                  <span className="text-[#0061FF] font-black">{notes[p.id]}</span>
                )}
                {notes?.[p.id] && explanations?.[p.id] ? ' · ' : ''}
                {explanations?.[p.id]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

'use client'

import React, { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
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
    const cardWidth = 340
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
        className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-navy shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-[#2563EB] hover:text-white hover:border-[#2563EB] hover:scale-110 active:scale-95 cursor-pointer ${
          canScrollLeft ? 'opacity-100 sm:opacity-90 group-hover/carousel:opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <ArrowLeft2 size={20} color="currentColor" />
      </button>

      {/* Scroll Right Button */}
      <button
        type="button"
        aria-label="גלול ימינה"
        onClick={() => scrollByAmount('right')}
        className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-navy shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-[#2563EB] hover:text-white hover:border-[#2563EB] hover:scale-110 active:scale-95 cursor-pointer ${
          canScrollRight ? 'opacity-100 sm:opacity-90 group-hover/carousel:opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <ArrowRight2 size={20} color="currentColor" />
      </button>

      {/* Carousel Container */}
      <div
        ref={containerRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-3.5 overflow-x-auto py-2.5 px-3 sm:px-6 scroll-smooth"
      >
        {listings.map((p) => (
          <div key={p.id} className="snap-start shrink-0">
            {/* Not wrapped in an anchor: the card is already role="button"
                (nesting both = double tab stops), so it navigates itself. */}
            <PropertyCard property={p} onSelect={() => router.push(`/listing/${p.id}`)} />
            {(notes?.[p.id] || explanations?.[p.id]) && (
              <p className="mt-2 max-w-[320px] text-[12px] font-semibold leading-relaxed text-slate-600 bg-blue-50/70 border border-blue-100/80 rounded-xl px-3 py-1.5">
                {notes?.[p.id] && (
                  <span className="text-[#2563EB] font-black">{notes[p.id]}</span>
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

'use client'

import React, { useEffect, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Briefcase,
  Building,
  Calendar,
  CloseCircle,
  Call,
  Heart,
  Home2,
  Location,
  Maximize4,
  MagicStar,
  Send2,
  TickCircle,
} from 'iconsax-react'
import { addressLabel, cityLabel, priceLabel, primaryImage } from '@/lib/live/api'
import type { Property } from '@/lib/live/types'
import { ensureLoaded, isSavedCached, onSavedChange, toggleSaved as toggleSavedRemote } from '@/lib/live/saved'
import PropertyCard from './PropertyCard'
import NearbyPlaces from './NearbyPlaces'
import EnrichmentCards from './EnrichmentCards'

const APP_URL = 'https://apps.apple.com/il/app/id6773088152'

function galleryImages(p: Property): string[] {
  const urls = [
    ...(p.media ?? []).filter((m) => m?.url && (!m.type || m.type.startsWith('image'))).map((m) => m.url),
    ...(p.imageUrls ?? []),
  ]
  return [...new Set(urls.filter(Boolean))]
}

function featureList(p: Property): string[] {
  if (Array.isArray(p.featureLabels) && p.featureLabels.length) return p.featureLabels
  if (Array.isArray(p.features)) return p.features
  if (p.features && typeof p.features === 'object') {
    return Object.keys(p.features).filter((k) => (p.features as Record<string, boolean>)[k] === true)
  }
  return []
}

function entryDateLabel(raw: string): string {
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString('he-IL')
}

function Chip({ label, icon: IconCmp }: { label: string; icon?: typeof Home2 }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-100 px-3.5 py-2 text-[12.5px] font-bold text-slate-800 border border-slate-200/60">
      {IconCmp && <IconCmp size={15} color="#0061FF" />}
      {label}
    </span>
  )
}

interface PropertyPreviewModalProps {
  property: Property | null
  allProperties?: Property[]
  onClose: () => void
  onSelectProperty?: (p: Property) => void
}

export default function PropertyPreviewModal({
  property,
  allProperties = [],
  onClose,
  onSelectProperty,
}: PropertyPreviewModalProps) {
  const [imgIndex, setImgIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const saved = useSyncExternalStore(
    onSavedChange,
    () => (property ? isSavedCached(property.id) : false),
    () => false,
  )
  useEffect(() => {
    void ensureLoaded()
  }, [])

  if (!property) return null

  const p = property
  const toggleSaved = () => toggleSavedRemote(p.id, !saved)
  const isBroker = p.agencyListing === true
  const images = galleryImages(p)
  const mainImg = images[imgIndex] ?? primaryImage(p)
  const features = featureList(p)
  const smartTags = p.smartTags ?? []
  const description = (p as unknown as { description?: unknown }).description
  const hasDescription = typeof description === 'string' && description.trim().length > 0
  const address = addressLabel(p)

  // Find similar properties matching city, transaction type or price range
  const similar = allProperties
    .filter((s) => s.id !== p.id)
    .filter((s) => (p.city ? s.city === p.city : s.transactionType === p.transactionType))
    .slice(0, 8)

  const share = async () => {
    const url = typeof location !== 'undefined' ? location.href : ''
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ url, title: address })
        return
      } catch {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
        {/* Backdrop click to close */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-md transition-opacity"
        />

        {/* Floating Modal Content Box — 1:1 Match with Full Listing Page */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="no-scrollbar relative z-10 my-auto flex max-h-[92vh] w-full max-w-[960px] flex-col overflow-y-auto rounded-[32px] border border-white/80 bg-white shadow-[0_25px_65px_rgba(0,0,0,0.35)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור תצוגה מקדימה"
            className="absolute top-4 left-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md backdrop-blur-md transition hover:bg-white hover:text-[#0061FF]"
          >
            <CloseCircle size={24} color="currentColor" />
          </button>

          {/* Body Container */}
          <div className="p-6 md:p-8 space-y-8">
            {/* Gallery + Price Column Grid */}
            <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px]">
              {/* Main Column: Gallery & Listing Details */}
              <div className="min-w-0">
                {/* Image Gallery */}
                <div className="relative aspect-[1.84] w-full overflow-hidden rounded-[24px] bg-slate-100 border border-slate-200/60 shadow-sm">
                  {mainImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mainImg} alt={address} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-50">
                      <Building size={54} color="#0061FF" />
                    </div>
                  )}

                  {/* Broker status tag overlay */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    {!isBroker ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-3.5 py-1.5 text-[12px] font-extrabold text-[#059669] shadow-md border border-[#A7F3D0]">
                        <Briefcase size={14} color="#059669" />
                        ללא תיווך · בעלים ישיר
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-[12px] font-extrabold text-[#0061FF] backdrop-blur-md shadow-md border border-blue-100">
                        <Briefcase size={14} color="#0061FF" />
                        מתווך
                      </span>
                    )}
                  </div>
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                    {images.map((url, i) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setImgIndex(i)}
                        className={`relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-slate-100 transition ${
                          i === imgIndex ? 'ring-2 ring-[#0061FF]' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Title & City */}
                <h1 className="mt-6 text-2xl font-black text-slate-900 md:text-3xl leading-snug">{address}</h1>
                <div className="mt-1 font-bold text-slate-500 text-sm">{cityLabel(p)}</div>

                {/* Info Chips */}
                <div className="no-scrollbar mt-4 flex flex-wrap gap-2">
                  <Chip icon={Home2} label={`${p.rooms} חדרים`} />
                  {p.sizeM2 != null && <Chip icon={Maximize4} label={`${p.sizeM2} מ״ר`} />}
                  {p.floor && <Chip icon={Building} label={`קומה ${p.floor}`} />}
                  {p.propertyType && <Chip label={p.propertyType} />}
                  {p.condition && <Chip label={p.condition} />}
                  {p.entryDate && <Chip icon={Calendar} label={`כניסה: ${entryDateLabel(p.entryDate)}`} />}
                </div>

                {/* Features (מה יש בדירה) */}
                {features.length > 0 && (
                  <div className="mt-8">
                    <h2 className="mb-3 text-lg font-black text-slate-900">מה יש בדירה</h2>
                    <div className="flex flex-wrap gap-2">
                      {features.map((f) => (
                        <span
                          key={f}
                          className="flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-1.5 text-[12.5px] font-bold text-slate-800"
                        >
                          <TickCircle size={15} color="#0061FF" variant="Bold" />
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Smart tags (נקודות חוזק) */}
                {smartTags.length > 0 && (
                  <div className="mt-8">
                    <h2 className="mb-3 text-lg font-black text-slate-900">נקודות חוזק</h2>
                    <div className="flex flex-wrap gap-2">
                      {smartTags.map((t) => (
                        <span
                          key={t}
                          className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3.5 py-1.5 text-[12.5px] font-bold text-slate-800 shadow-sm"
                        >
                          <TickCircle size={15} color="#0061FF" />
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description (על הדירה) */}
                {hasDescription && (
                  <div className="mt-8">
                    <h2 className="mb-3 text-lg font-black text-slate-900">על הדירה</h2>
                    <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-slate-700 font-medium">
                      {description as string}
                    </p>
                  </div>
                )}

                {/* Enrichment Cards (מדד מחיר ושכונה) */}
                <div className="mt-8">
                  <EnrichmentCards listingId={p.id} />
                </div>

                {/* Nearby Places (אינטליגנציית אזור בסביבה) */}
                {Number.isFinite(p.lat) &&
                  Number.isFinite(p.lon) &&
                  Math.abs(p.lat as number) > 0.01 &&
                  Math.abs(p.lon as number) > 0.01 && (
                    <div className="mt-8">
                      <NearbyPlaces lat={p.lat as number} lon={p.lon as number} city={p.city} />
                    </div>
                  )}
              </div>

              {/* Side Column: Sticky Price & Action Box */}
              <aside className="lg:sticky lg:top-4">
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg space-y-4">
                  <div className="text-3xl font-black text-slate-900">{priceLabel(p)}</div>
                  <div className="font-bold text-slate-500 text-sm">
                    {p.transactionType === 'sale' ? 'למכירה' : 'להשכרה'}
                  </div>
                  <div className="border-t border-slate-100 pt-2" />

                  <a
                    href={APP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0061FF] py-3.5 text-center font-bold text-white shadow-md transition hover:bg-blue-700"
                  >
                    <Call size={18} color="currentColor" />
                    <span>צור קשר באפליקציה</span>
                  </a>

                  <button
                    type="button"
                    onClick={share}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 py-3 font-bold text-slate-700 transition hover:border-[#0061FF] hover:text-[#0061FF]"
                  >
                    <Send2 size={17} color="currentColor" />
                    <span>שיתוף</span>
                  </button>

                  {copied && (
                    <div className="text-center text-[12px] font-bold text-emerald-600">הקישור הועתק ✓</div>
                  )}

                  <button
                    type="button"
                    onClick={toggleSaved}
                    className={`flex w-full items-center justify-center gap-2 rounded-full border py-2.5 text-xs font-bold transition ${
                      saved ? 'border-red-200 bg-red-50 text-red-500' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Heart size={16} variant={saved ? 'Bold' : 'Linear'} color={saved ? '#FF5A67' : 'currentColor'} />
                    <span>{saved ? 'שמור' : 'שמור דירה'}</span>
                  </button>

                  <div className="text-center text-[11.5px] font-semibold text-slate-400">
                    חינם · בלי דמי תיווך מוסתרים
                  </div>
                </div>
              </aside>
            </div>

            {/* Bottom Section: Similar Listings (דירות דומות להצעה) */}
            {similar.length > 0 && (
              <div className="pt-8 border-t border-slate-200/80">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <MagicStar size={20} color="#0061FF" variant="Bold" />
                    <span>דירות דומות באזור להצעה</span>
                  </h2>
                  <span className="text-xs font-bold text-slate-400">פרמטרים דומים</span>
                </div>

                <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-3">
                  {similar.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => onSelectProperty?.(s)}
                      className="shrink-0 cursor-pointer transition hover:scale-[1.01]"
                    >
                      <PropertyCard property={s} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

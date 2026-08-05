'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight2, Building, Calendar, Home2, Maximize4, Send2, TickCircle } from 'iconsax-react'
import {
  addressLabel,
  cityLabel,
  fetchProperties,
  fetchPropertyById,
  priceLabel,
  primaryImage,
} from '@/lib/live/api'
import type { Property } from '@/lib/live/types'
import PropertyCard from '@/components/keyz/PropertyCard'
import NearbyPlaces from '@/components/keyz/NearbyPlaces'
import EnrichmentCards from '@/components/keyz/EnrichmentCards'

const APP_URL = 'https://apps.apple.com/il/app/id6773088152'

// All image urls of a property: media images first, then imageUrls, deduped.
function galleryImages(p: Property): string[] {
  const urls = [
    ...(p.media ?? []).filter((m) => m?.url && (!m.type || m.type.startsWith('image'))).map((m) => m.url),
    ...(p.imageUrls ?? []),
  ]
  return [...new Set(urls.filter(Boolean))]
}

// featureLabels > features (array) > features (object, truthy keys).
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

function Chip({ icon: IconCmp, label }: { icon?: typeof Home2; label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-cloud px-4 py-2.5 text-[13px] font-bold text-navy">
      {IconCmp && <IconCmp size={16} color="#072946" />}
      {label}
    </span>
  )
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-[1200px] animate-pulse px-4">
      <div className="mb-6 h-4 w-48 rounded bg-cloud" />
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="aspect-[1.84] w-full rounded-[28px] bg-primary-light2" />
          <div className="mt-3 flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[84px] w-[84px] rounded-xl bg-cloud" />
            ))}
          </div>
          <div className="mt-8 h-8 w-2/3 rounded bg-cloud" />
          <div className="mt-3 h-4 w-1/3 rounded bg-cloud" />
          <div className="mt-6 flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 w-28 rounded-xl bg-cloud" />
            ))}
          </div>
          <div className="mt-8 h-4 w-full rounded bg-cloud" />
          <div className="mt-3 h-4 w-5/6 rounded bg-cloud" />
        </div>
        <div className="h-64 rounded-[28px] border border-border-app bg-white p-6 card-shadow">
          <div className="h-9 w-40 rounded bg-cloud" />
          <div className="mt-3 h-4 w-24 rounded bg-cloud" />
          <div className="mt-8 h-12 w-full rounded-full bg-primary-light2" />
        </div>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-center px-4 py-24 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-light2">
        <Building size={48} color="#2563EB" />
      </div>
      <h1 className="mt-6 text-2xl font-black text-navy">הדירה כבר לא זמינה</h1>
      <p className="mt-2 text-secondary-text">יכול להיות שהיא הושכרה, או שהקישור כבר לא בתוקף.</p>
      <Link
        href="/real-estate"
        className="mt-8 rounded-full bg-primary px-8 py-3.5 font-bold text-white transition hover:bg-primary-dark"
      >
        לכל הדירות
      </Link>
    </div>
  )
}

// Floating back button — fixed below the 64px TopBar, inline-start (RTL = right).
// ArrowRight2 points right, which reads as "back" in RTL.
function BackButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      aria-label="חזרה"
      onClick={() => {
        if (window.history.length > 1) router.back()
        else router.push('/real-estate')
      }}
      className="fixed top-[76px] start-4 z-40 flex h-[42px] w-[42px] items-center justify-center rounded-full border border-border-app bg-white badge-shadow transition hover:border-primary"
    >
      <ArrowRight2 size={20} color="#072946" />
    </button>
  )
}

export default function ListingClient({ id }: { id: string }) {
  const [state, setState] = useState<'loading' | 'notFound' | 'loaded'>('loading')
  const [property, setProperty] = useState<Property | null>(null)
  const [live, setLive] = useState(true)
  const [similar, setSimilar] = useState<Property[]>([])
  const [imgIndex, setImgIndex] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setState('loading')
    setImgIndex(0)
    fetchPropertyById(id).then(({ item, live }) => {
      if (cancelled) return
      setLive(live)
      if (!item) {
        setState('notFound')
        return
      }
      setProperty(item)
      setState('loaded')
      fetchProperties(60).then(({ items }) => {
        if (cancelled) return
        setSimilar(
          items
            .filter((p) => p.id !== item.id)
            .filter((p) => (item.city ? p.city === item.city : p.transactionType === item.transactionType))
            .slice(0, 8),
        )
      })
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (state === 'loading')
    return (
      <main className="flex-1 pt-28 pb-20">
        <BackButton />
        <Skeleton />
      </main>
    )
  if (state === 'notFound' || !property)
    return (
      <main className="flex-1 pt-28 pb-20">
        <BackButton />
        <NotFound />
      </main>
    )

  const p = property
  const images = galleryImages(p)
  const mainImg = images[imgIndex] ?? primaryImage(p)
  const features = featureList(p)
  const smartTags = p.smartTags ?? []
  const description = (p as unknown as { description?: unknown }).description
  const hasDescription = typeof description === 'string' && description.trim().length > 0
  const address = addressLabel(p)

  const share = async () => {
    const url = typeof location !== 'undefined' ? location.href : ''
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ url, title: address })
        return
      } catch {
        /* user cancelled — fall through to clipboard */
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
    <main className="flex-1 pt-28 pb-20">
      <BackButton />
      <div className="mx-auto max-w-[1200px] px-4">
        {/* Breadcrumbs */}
        <nav className="mb-5 text-[13px] text-secondary-text">
          <Link href="/" className="hover:text-primary">ראשי</Link>
          <span className="mx-1.5">/</span>
          <Link href="/real-estate" className="hover:text-primary">דירות</Link>
          {p.city && (
            <>
              <span className="mx-1.5">/</span>
              <span>{p.city}</span>
            </>
          )}
        </nav>

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
          {/* Main column */}
          <div className="min-w-0">
            {/* Gallery */}
            <div className="relative aspect-[1.84] w-full overflow-hidden rounded-[28px] bg-primary-light2">
              {mainImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mainImg} alt={address} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building size={64} color="#2563EB" />
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                {images.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    aria-label={`תמונה ${i + 1}`}
                    onClick={() => setImgIndex(i)}
                    className={`relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-xl bg-primary-light2 ${
                      i === imgIndex ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="mt-7 text-2xl font-black text-navy md:text-3xl">{address}</h1>
            <div className="mt-1.5 font-semibold text-secondary-text">{cityLabel(p)}</div>

            {/* Info chips */}
            <div className="no-scrollbar mt-5 flex flex-wrap gap-2">
              <Chip icon={Home2} label={`${p.rooms} חדרים`} />
              {p.sizeM2 != null && <Chip icon={Maximize4} label={`${p.sizeM2} מ״ר`} />}
              {p.floor && <Chip icon={Building} label={`קומה ${p.floor}`} />}
              {p.propertyType && <Chip label={p.propertyType} />}
              {p.condition && <Chip label={p.condition} />}
              {p.entryDate && <Chip icon={Calendar} label={`כניסה: ${entryDateLabel(p.entryDate)}`} />}
            </div>

            {/* Features */}
            {features.length > 0 && (
              <>
                <h2 className="mt-8 mb-3 text-xl font-black text-navy">מה יש בדירה</h2>
                <div className="flex flex-wrap gap-2">
                  {features.map((f) => (
                    <span
                      key={f}
                      className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-light2 px-4 py-2 text-[13px] font-bold text-navy"
                    >
                      <TickCircle size={15} color="#2563EB" />
                      {f}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Smart tags */}
            {smartTags.length > 0 && (
              <>
                <h2 className="mt-8 mb-3 text-xl font-black text-navy">נקודות חוזק</h2>
                <div className="flex flex-wrap gap-2">
                  {smartTags.map((t) => (
                    <span
                      key={t}
                      className="flex items-center gap-1.5 rounded-full border border-border-app bg-white px-4 py-2 text-[13px] font-bold text-navy"
                    >
                      <TickCircle size={15} color="#2563EB" />
                      {t}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Description */}
            {hasDescription && (
              <>
                <h2 className="mt-8 mb-3 text-xl font-black text-navy">על הדירה</h2>
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-navy/90">
                  {description as string}
                </p>
              </>
            )}

            {/* Enrichment — price-vs-median badge + neighborhood score, same order
                as the app's property page (price badge → score → nearby). */}
            <EnrichmentCards listingId={p.id} />

            {/* Nearby / geo intelligence — same layers as the app's property page
                (NearbyPlacesCard showAllKinds), real named places + distances. */}
            {Number.isFinite(p.lat) &&
              Number.isFinite(p.lon) &&
              Math.abs(p.lat as number) > 0.01 &&
              Math.abs(p.lon as number) > 0.01 && (
                <NearbyPlaces lat={p.lat as number} lon={p.lon as number} city={p.city} />
              )}
          </div>

          {/* Sticky price card */}
          <aside className="lg:sticky lg:top-24">
            <div className="rounded-[28px] border border-border-app bg-white p-6 card-shadow">
              {!live && (
                <div className="mb-3">
                  <span className="inline-block rounded-full bg-[#FEF3C7] px-3 py-1 text-[12px] font-bold text-[#C2410C]">
                    נתוני דוגמה
                  </span>
                </div>
              )}
              <div className="text-3xl font-black text-navy">{priceLabel(p)}</div>
              <div className="mt-1 font-bold text-secondary-text">
                {p.transactionType === 'sale' ? 'למכירה' : 'להשכרה'}
              </div>
              <div className="my-5 border-t border-border-app" />
              <a
                href={APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-full bg-primary py-3.5 text-center font-bold text-white transition hover:bg-primary-dark"
              >
                לפרטים ויצירת קשר באפליקציה
              </a>
              <button
                type="button"
                onClick={share}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-full border border-border-app py-3 font-bold text-navy transition hover:border-primary hover:text-primary"
              >
                <Send2 size={17} color="currentColor" />
                שיתוף
              </button>
              {copied && (
                <div className="mt-2 text-center text-[12px] font-bold text-success">הקישור הועתק ✓</div>
              )}
              <div className="mt-4 text-center text-[12px] text-secondary-text">
                חינם · בלי דמי תיווך מוסתרים
              </div>
            </div>
          </aside>
        </div>

        {/* Similar listings */}
        {similar.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-4 text-xl font-black text-navy">דירות דומות</h2>
            <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-2">
              {similar.map((s) => (
                <a key={s.id} href={`/listing/${s.id}`} className="snap-start">
                  <PropertyCard property={s} />
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

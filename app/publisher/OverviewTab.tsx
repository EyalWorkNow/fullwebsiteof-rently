'use client'

// "סקירה" — per-listing health, honest about what it can and cannot know
// (spec §0/§4). No live ticking counters: this loads once per tab visit.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building,
  Danger,
  Eye,
  Heart,
  MessageQuestion,
  RefreshCircle,
  TickCircle,
} from 'iconsax-react'
import type { User } from 'firebase/auth'
import { fetchProperties } from '@/lib/live/api'
import { addressLabel, cityLabel, priceLabel, primaryImage } from '@/lib/live/api'
import { useAuthGate } from '@/components/keyz/auth/AuthGate'
import {
  fetchListingHealth,
  fetchOwnerMatches,
  fetchOwnerProperties,
  formatRate,
  type HealthState,
  type ListingHealth,
} from '@/lib/live/analytics'

const OVERVIEW_REASON = 'כדי לראות איך הדירות שלך מתפקדות מול האזור'

const STATE_META: Record<HealthState, { label: string; cls: string; Icon: typeof TickCircle }> = {
  healthy: { label: 'תקין', cls: 'bg-success/10 text-success', Icon: TickCircle },
  watch: { label: 'לשים לב', cls: 'bg-amber-100 text-amber-600', Icon: MessageQuestion },
  needs_action: { label: 'דורש טיפול', cls: 'bg-[#FFF2F2] text-coral', Icon: Danger },
}

export default function OverviewTab({ user }: { user: User | null }) {
  const [cards, setCards] = useState<ListingHealth[] | null>(null)
  const [loadOk, setLoadOk] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const { requireAuth } = useAuthGate()
  const uid = user?.uid ?? null

  useEffect(() => {
    if (!uid) {
      setCards([])
      return
    }
    let alive = true
    setCards(null)
    ;(async () => {
      const [{ items, ok }, { items: catalogue }, matches] = await Promise.all([
        fetchOwnerProperties(uid),
        fetchProperties(500),
        fetchOwnerMatches(uid),
      ])
      if (!alive) return
      if (!ok) {
        setLoadOk(false)
        setCards([])
        return
      }
      setLoadOk(true)
      const health = await Promise.all(
        items.map((p) => fetchListingHealth(p, catalogue, { ownerUid: uid, matches })),
      )
      if (alive) setCards(health)
    })()
    return () => {
      alive = false
    }
  }, [uid, reloadKey])

  if (!uid) {
    return (
      <div className="mx-auto max-w-[500px] rounded-[28px] bg-cloud px-6 py-12 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light2 text-primary">
          <Eye size={26} variant="Bold" color="currentColor" />
        </span>
        <div className="mt-4 font-black text-navy">הסקירה שלכם תופיע כאן</div>
        <p className="mt-1.5 text-sm leading-relaxed text-secondary-text">
          צפיות אמיתיות, שמירות ופניות לכל דירה — מול דירות דומות באזור שלכם.
        </p>
        <button
          onClick={() => requireAuth(OVERVIEW_REASON, () => {})}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-border-app bg-white px-5 py-2.5 text-sm font-bold text-navy transition-colors hover:border-primary/40"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border-app bg-cloud text-[10px] font-black text-primary">
            G
          </span>
          התחברות עם Google
        </button>
      </div>
    )
  }

  if (cards === null) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    )
  }

  if (!loadOk) {
    return (
      <div className="mx-auto max-w-[500px] rounded-2xl bg-cloud px-4 py-10 text-center text-secondary-text">
        <p>לא הצלחנו לטעון את הסקירה כרגע.</p>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="mt-3 inline-flex items-center gap-1.5 font-bold text-primary hover:underline"
        >
          <RefreshCircle size={16} color="currentColor" />
          נסו שוב
        </button>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-[500px] rounded-[28px] bg-cloud px-6 py-12 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light2 text-primary">
          <Building size={26} variant="Bold" color="currentColor" />
        </span>
        <div className="mt-4 font-black text-navy">עוד אין נכסים לסקור</div>
        <p className="mt-1.5 text-sm text-secondary-text">
          פרסמו את הדירה הראשונה בלשונית &quot;עזרא — הוספת דירה&quot;, והסקירה תופיע כאן.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-2">
      {cards.map((h) => (
        <HealthCard key={h.property.id} h={h} />
      ))}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl bg-cloud px-3 py-2 text-center">
      <div className="text-lg font-black text-navy">{value ?? '—'}</div>
      <div className="text-[11px] font-semibold text-secondary-text">{label}</div>
    </div>
  )
}

function HealthCard({ h }: { h: ListingHealth }) {
  const meta = STATE_META[h.state]
  const img = primaryImage(h.property)
  const rate =
    h.inquiries != null && h.views != null
      ? formatRate(h.inquiries, h.views, { numerator: 'פניות', denominator: 'צפיות' })
      : null

  return (
    <div className="overflow-hidden rounded-[22px] border border-border-app bg-white card-shadow">
      <div className="flex items-start gap-3 p-4">
        <Link href={`/listing/${h.property.id}`} className="shrink-0">
          <div className="h-16 w-20 overflow-hidden rounded-xl bg-cloud">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-secondary-text">
                <Building size={22} variant="Bulk" color="currentColor" />
              </div>
            )}
          </div>
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/listing/${h.property.id}`} className="block truncate font-black text-navy hover:text-primary">
            {addressLabel(h.property)}
          </Link>
          <div className="truncate text-xs text-secondary-text">{cityLabel(h.property)}</div>
          <div className="mt-1 font-black text-primary">{priceLabel(h.property)}</div>
        </div>
        <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.cls}`}>
          <meta.Icon size={12} color="currentColor" variant="Bold" />
          {meta.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4">
        <Stat label="צפיות" value={h.views} />
        <Stat label="שמירות" value={h.saves} />
        <Stat label="פניות" value={h.inquiries} />
      </div>

      <div className="space-y-1.5 px-4 pb-4 pt-3">
        {h.daysOnMarket != null && (
          <p className="text-[12.5px] text-secondary-text">
            <span className="font-bold text-navy">{h.daysOnMarket} ימים</span> בשוק
            {h.benchmark.sampleSize >= 5 && h.benchmark.medianDaysOnMarket != null && (
              <> · חציון האזור {Math.round(h.benchmark.medianDaysOnMarket)} ימים ({h.benchmark.sampleSize} דירות דומות)</>
            )}
          </p>
        )}
        {rate && (
          <p className="text-[12.5px] text-secondary-text">
            <Heart size={12} color="currentColor" className="me-1 inline text-coral" variant="Bold" />
            {rate.text}
          </p>
        )}
        {h.reasons.length > 0 && (
          <ul className="mt-1 space-y-1">
            {h.reasons.map((r, i) => (
              <li key={i} className="text-[12.5px] font-semibold leading-relaxed text-navy">
                • {r}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

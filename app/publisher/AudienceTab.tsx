'use client'

// "קהל" — closes the loop the app never does: the publisher declares a target
// audience at publish time and gets zero feedback on who actually showed up.
// Aggregate-only, k>=5, non-protected dimensions (see lib/live/analytics.ts).

import { useEffect, useMemo, useState } from 'react'
import { Building, InfoCircle, Lock1, TickCircle, UserOctagon, Warning2 } from 'iconsax-react'
import type { User } from 'firebase/auth'
import { addressLabel, cityLabel } from '@/lib/live/api'
import { useAuthGate } from '@/components/keyz/auth/AuthGate'
import {
  K_ANON,
  buildAudience,
  declaredTargetsOf,
  fetchOwnerProperties,
  fetchPropertyLikes,
  type AudienceBreakdown,
  type OwnerProperty,
} from '@/lib/live/analytics'

const AUDIENCE_REASON = 'כדי לראות מי באמת מתעניין בדירות שלכם'

const MATCH_META: Record<
  AudienceBreakdown['matchQuality'],
  { label: string; cls: string; Icon: typeof TickCircle } | null
> = {
  aligned: { label: 'תואם ליעד שהצהרתם', cls: 'bg-success/10 text-success', Icon: TickCircle },
  partial: { label: 'התאמה חלקית ליעד', cls: 'bg-amber-100 text-amber-600', Icon: Warning2 },
  mismatch: { label: 'שונה מהיעד שהצהרתם', cls: 'bg-[#FFF2F2] text-coral', Icon: Warning2 },
  unknown: null,
}

export default function AudienceTab({ user }: { user: User | null }) {
  const [properties, setProperties] = useState<OwnerProperty[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [breakdown, setBreakdown] = useState<AudienceBreakdown | null>(null)
  const [loadingBreakdown, setLoadingBreakdown] = useState(false)
  const { requireAuth } = useAuthGate()
  const uid = user?.uid ?? null

  useEffect(() => {
    if (!uid) {
      setProperties([])
      return
    }
    let alive = true
    fetchOwnerProperties(uid).then(({ items }) => {
      if (!alive) return
      setProperties(items)
      setSelectedId((cur) => cur ?? items[0]?.id ?? null)
    })
    return () => {
      alive = false
    }
  }, [uid])

  const selected = useMemo(
    () => properties?.find((p) => p.id === selectedId) ?? null,
    [properties, selectedId],
  )

  useEffect(() => {
    if (!selected) {
      setBreakdown(null)
      return
    }
    let alive = true
    setLoadingBreakdown(true)
    fetchPropertyLikes(selected.id).then((rows) => {
      if (!alive) return
      setBreakdown(buildAudience(rows, declaredTargetsOf(selected)))
      setLoadingBreakdown(false)
    })
    return () => {
      alive = false
    }
  }, [selected])

  if (!uid) {
    return (
      <div className="mx-auto max-w-[500px] rounded-[28px] bg-cloud px-6 py-12 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light2 text-primary">
          <UserOctagon size={26} variant="Bold" color="currentColor" />
        </span>
        <div className="mt-4 font-black text-navy">מי מתעניין בדירות שלכם?</div>
        <p className="mt-1.5 text-sm leading-relaxed text-secondary-text">
          פילוח מצרפי ואנונימי — סוגי משק בית, שלב בחיים ותקציב — בלי לחשוף אף פרט אישי.
        </p>
        <button
          onClick={() => requireAuth(AUDIENCE_REASON, () => {})}
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

  if (properties === null) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="mx-auto max-w-[500px] rounded-[28px] bg-cloud px-6 py-12 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light2 text-primary">
          <Building size={26} variant="Bold" color="currentColor" />
        </span>
        <div className="mt-4 font-black text-navy">עוד אין דירות לנתח</div>
        <p className="mt-1.5 text-sm text-secondary-text">
          פילוח קהל יופיע כאן ברגע שתפרסמו דירה ראשונה ותתחילו לקבל התעניינות.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-[900px] mx-auto w-full py-4 space-y-6 flex flex-col">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {properties.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedId(p.id)}
            className={`shrink-0 rounded-2xl border px-4 py-2.5 text-start text-[13px] transition ${
              p.id === selectedId
                ? 'border-primary/30 bg-primary-light2 text-primary'
                : 'border-border-app bg-white text-navy hover:border-primary/30'
            }`}
          >
            <div className="font-bold">{addressLabel(p)}</div>
            <div className="text-[11px] font-semibold text-secondary-text">{cityLabel(p)}</div>
          </button>
        ))}
      </div>

      {loadingBreakdown || !breakdown ? (
        <div className="flex justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
        </div>
      ) : (
        <AudienceCard breakdown={breakdown} />
      )}
    </div>
  )
}

function AudienceCard({ breakdown }: { breakdown: AudienceBreakdown }) {
  const meta = MATCH_META[breakdown.matchQuality]

  if (breakdown.suppressed) {
    return (
      <div className="rounded-[22px] border border-border-app bg-white p-6 text-center card-shadow">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cloud text-secondary-text">
          <Lock1 size={22} variant="Bold" color="currentColor" />
        </span>
        <p className="mt-3 font-black text-navy">
          {breakdown.total} מתעניינים עד כה
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-secondary-text">
          כדי לשמור על פרטיות המתעניינים אנחנו מציגים פילוח רק כשיש לפחות {K_ANON} — כמעט שם.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[22px] border border-border-app bg-white p-5 card-shadow">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-bold text-secondary-text">
          פילוח מצרפי מתוך {breakdown.total} מתעניינים
        </p>
        {meta && (
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold ${meta.cls}`}>
            <meta.Icon size={13} color="currentColor" variant="Bold" />
            {meta.label}
          </span>
        )}
      </div>

      {breakdown.declaredTargets.length > 0 && (
        <p className="mt-2 text-[12.5px] text-secondary-text">
          יעד שהצהרתם: <span className="font-bold text-navy">{breakdown.declaredTargets.join(' · ')}</span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {breakdown.segments.map((s) => (
          <span
            key={s.key}
            className="flex items-center gap-1.5 rounded-full bg-cloud px-3 py-1.5 text-[12.5px] font-bold text-navy"
          >
            {s.label}
            <span className="rounded-full bg-white px-1.5 text-[11px] text-primary">{s.count}</span>
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-1.5 border-t border-border-app pt-3 text-[11.5px] leading-relaxed text-secondary-text">
        <InfoCircle size={14} color="currentColor" className="mt-0.5 shrink-0" />
        <span>
          לעולם לא מוצג מידע לפי דת, מוצא, גיל או הכנסה — רק סוג משק בית, שלב בחיים ותקציב, ורק
          כשיש לפחות {K_ANON} אנשים בקבוצה.
        </span>
      </div>
    </div>
  )
}

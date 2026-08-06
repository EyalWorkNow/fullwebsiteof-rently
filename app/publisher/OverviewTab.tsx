'use client'

// "סקירה" — the publisher's BI dashboard: portfolio KPIs, an engagement funnel,
// a per-property ranking, price positioning, an aggregate audience rollup, and
// a full sortable comparison table. Built per the dataviz skill's procedure —
// form chosen before color, and every color slot does exactly one job:
//   · engagement funnel   → ORDINAL   (one hue, monotone lightness — stage order matters)
//   · property ranking    → NOMINAL   (one hue — properties are identity, not a scale)
//   · price positioning   → STATUS    (the app's own fixed great_deal/fair/above_market tokens)
//   · audience segments   → NOMINAL   (one hue, sorted by magnitude)
// No fabricated numbers, no fake trend lines — there is no cheap historical
// time-series available (spec §2's known GSI limitation), so every figure here
// is a real current count. A failed fetch renders '—', never 0.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowDown2,
  ArrowUp2,
  Building,
  Chart2,
  Danger,
  Eye,
  Heart,
  MessageQuestion,
  RefreshCircle,
  TickCircle,
  TrendDown,
  TrendUp,
  UserOctagon,
} from 'iconsax-react'
import type { User } from 'firebase/auth'
import { fetchProperties } from '@/lib/live/api'
import { addressLabel, cityLabel, priceLabel, primaryImage } from '@/lib/live/api'
import { useAuthGate } from '@/components/keyz/auth/AuthGate'
import {
  buildAudience,
  declaredTargetsOf,
  fetchListingHealth,
  fetchOwnerMatches,
  fetchOwnerProperties,
  fetchPropertyLikes,
  formatRate,
  K_ANON,
  type AudienceBreakdown,
  type HealthState,
  type ListingHealth,
} from '@/lib/live/analytics'

const OVERVIEW_REASON = 'כדי לראות איך הדירות שלך מתפקדות מול האזור'

const STATE_META: Record<HealthState, { label: string; cls: string; Icon: typeof TickCircle }> = {
  healthy: { label: 'תקין', cls: 'bg-success/10 text-success', Icon: TickCircle },
  watch: { label: 'לשים לב', cls: 'bg-amber-100 text-amber-600', Icon: MessageQuestion },
  needs_action: { label: 'דורש טיפול', cls: 'bg-[#FFF2F2] text-coral', Icon: Danger },
}

// Same three verdict tokens as components/keyz/EnrichmentCards.tsx's PriceBadge
// (price_badge.dart _styleFor) — status is fixed and reserved, never re-derived.
const PRICE_TIERS: Record<string, { label: string; fg: string; bg: string; Icon: typeof TrendUp }> = {
  great_deal: { label: 'מחיר מצוין לאזור', fg: '#15803D', bg: '#EFF6FF', Icon: TrendDown },
  above_market: { label: 'מעל מחיר השוק', fg: '#C2410C', bg: '#F5F7FA', Icon: TrendUp },
  fair: { label: 'מחיר הוגן לאזור', fg: '#1D4ED8', bg: '#F1F5F9', Icon: TickCircle },
}

// ── Ordinal ramp for the engagement funnel — one hue, monotone lightness ─────
// (color-formula.md: "funnel stage" is the canonical ordinal example).
const FUNNEL_STEPS = ['#BFDBFE', '#60A5FA', '#2563EB'] // light -> dark, views -> saves -> inquiries

// ── Nominal single-hue for magnitude comparisons across properties/segments ──
const NOMINAL_HUE = '#2563EB'

type SortKey = 'views' | 'saves' | 'inquiries' | 'daysOnMarket' | 'price'
type SortDir = 'asc' | 'desc'

function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + 'K'
  return String(n)
}

function sum(values: (number | null)[]): { total: number; known: number } {
  let total = 0
  let known = 0
  for (const v of values) {
    if (v != null) {
      total += v
      known++
    }
  }
  return { total, known }
}

export default function OverviewTab({ user }: { user: User | null }) {
  const [cards, setCards] = useState<ListingHealth[] | null>(null)
  const [audience, setAudience] = useState<AudienceBreakdown | null>(null)
  const [loadOk, setLoadOk] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'views', dir: 'desc' })
  const { requireAuth } = useAuthGate()
  const uid = user?.uid ?? null

  useEffect(() => {
    if (!uid) {
      setCards([])
      return
    }
    let alive = true
    setCards(null)
    setAudience(null)
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
      if (!alive) return
      setCards(health)

      // Portfolio-wide audience rollup: same k>=5 / protected-dimension rules as
      // the per-property Audience tab, just fed every property's likes at once.
      const likeSets = await Promise.all(items.map((p) => fetchPropertyLikes(p.id)))
      if (!alive) return
      const allLikes = likeSets.flatMap((rows) => rows ?? [])
      const allTargets = items.flatMap((p) => declaredTargetsOf(p))
      setAudience(buildAudience(allLikes, allTargets))
    })()
    return () => {
      alive = false
    }
  }, [uid, reloadKey])

  const sorted = useMemo(() => {
    if (!cards) return []
    const dir = sort.dir === 'asc' ? 1 : -1
    const value = (h: ListingHealth): number => {
      switch (sort.key) {
        case 'views':
          return h.views ?? -1
        case 'saves':
          return h.saves ?? -1
        case 'inquiries':
          return h.inquiries ?? -1
        case 'daysOnMarket':
          return h.daysOnMarket ?? -1
        case 'price':
          return h.property.price ?? -1
      }
    }
    return [...cards].sort((a, b) => (value(a) - value(b)) * dir)
  }, [cards, sort])

  const portfolio = useMemo(() => {
    if (!cards || cards.length === 0) return null
    const views = sum(cards.map((c) => c.views))
    const saves = sum(cards.map((c) => c.saves))
    const inquiries = sum(cards.map((c) => c.inquiries))
    const dom = sum(cards.map((c) => c.daysOnMarket))
    const tiers: Record<string, number> = { great_deal: 0, fair: 0, above_market: 0 }
    for (const c of cards) {
      const b = String(c.priceBadge?.badge ?? '').toLowerCase()
      if (b === 'great_deal' || b === 'above_market') tiers[b]++
      else if (c.priceBadge?.badge) tiers.fair++
    }
    return { views, saves, inquiries, dom, tiers }
  }, [cards])

  if (!uid) {
    return (
      <div className="mx-auto max-w-[500px] rounded-[28px] bg-cloud px-6 py-12 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light2 text-primary">
          <Eye size={26} variant="Bold" color="currentColor" />
        </span>
        <div className="mt-4 font-black text-navy">הדשבורד שלכם יופיע כאן</div>
        <p className="mt-1.5 text-sm leading-relaxed text-secondary-text">
          צפיות אמיתיות, שמירות ופניות לכל דירה — מול דירות דומות באזור שלכם, ותמונת מצב מלאה על כל התיק.
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
        <p>לא הצלחנו לטעון את הדשבורד כרגע.</p>
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
          פרסמו את הדירה הראשונה בלשונית &quot;עזרא — הוספת דירה&quot;, והדשבורד יתמלא כאן.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6 p-4 sm:p-6">
      {portfolio && <KpiRow cards={cards} portfolio={portfolio} />}
      {portfolio && <FunnelCard portfolio={portfolio} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RankingCard cards={cards} />
        {portfolio && <PriceTiersCard portfolio={portfolio} total={cards.length} />}
      </div>

      {audience && <AudienceRollupCard audience={audience} />}

      <ComparisonTable cards={sorted} sort={sort} onSort={setSort} />
    </div>
  )
}

// ═══════════════════════════════ KPI row ═════════════════════════════════════
// Stat-tile contract (marks-and-anatomy.md): label + value, no fabricated delta/
// sparkline — there is no historical baseline to compare against honestly.

function StatTile({
  label,
  value,
  caption,
}: {
  label: string
  value: string
  caption?: string
}) {
  return (
    <div className="rounded-[18px] border border-border-app bg-white p-4 card-shadow">
      <div className="text-[12.5px] font-bold text-secondary-text">{label}</div>
      <div className="mt-1 text-[28px] font-black leading-none text-navy">{value}</div>
      {caption && <div className="mt-1.5 text-[11.5px] font-semibold text-secondary-text">{caption}</div>}
    </div>
  )
}

function KpiRow({
  cards,
  portfolio,
}: {
  cards: ListingHealth[]
  portfolio: { views: { total: number; known: number }; saves: { total: number; known: number }; inquiries: { total: number; known: number }; dom: { total: number; known: number } }
}) {
  const needsAction = cards.filter((c) => c.state === 'needs_action').length
  const avgDom = portfolio.dom.known > 0 ? Math.round(portfolio.dom.total / portfolio.dom.known) : null
  const rate =
    portfolio.inquiries.known > 0 && portfolio.views.known > 0
      ? formatRate(portfolio.inquiries.total, portfolio.views.total, { numerator: 'פניות', denominator: 'צפיות' })
      : null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatTile label="דירות פעילות" value={String(cards.length)} caption={needsAction > 0 ? `${needsAction} דורשות טיפול` : 'הכול תקין'} />
      <StatTile
        label="סה״כ צפיות"
        value={portfolio.views.known > 0 ? compact(portfolio.views.total) : '—'}
        caption={portfolio.views.known < cards.length ? `${cards.length - portfolio.views.known} דירות בלי נתון` : undefined}
      />
      <StatTile label="סה״כ שמירות" value={portfolio.saves.known > 0 ? compact(portfolio.saves.total) : '—'} />
      <StatTile label="סה״כ פניות" value={portfolio.inquiries.known > 0 ? compact(portfolio.inquiries.total) : '—'} />
      <StatTile label="ימים בשוק (ממוצע)" value={avgDom != null ? String(avgDom) : '—'} />
      <StatTile label="יחס פנייה־לצפייה" value={rate ? rate.text : '—'} caption={rate && !rate.isRate ? 'מדגם קטן' : undefined} />
    </div>
  )
}

// ═══════════════════════════ Engagement funnel (ordinal) ═════════════════════

function FunnelBar({ label, value, max, color, formatted }: { label: string; value: number; max: number; color: string; formatted: string }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0
  return (
    <div className="group relative flex items-center gap-3">
      <span className="w-16 shrink-0 text-[12.5px] font-bold text-secondary-text">{label}</span>
      <div className="h-6 min-w-0 flex-1 rounded-full bg-cloud">
        <div
          className="flex h-6 items-center justify-end rounded-full px-2.5 transition-all"
          style={{ width: `${pct}%`, backgroundColor: color, minWidth: '2.5rem' }}
        >
          <span className="text-[12px] font-black text-white">{formatted}</span>
        </div>
      </div>
      {/* per-mark hover tooltip (interaction.md) */}
      <span className="pointer-events-none absolute end-0 top-full z-10 mt-1 hidden rounded-lg bg-navy px-2 py-1 text-[11px] font-bold text-white group-hover:block">
        {value.toLocaleString('he-IL')}
      </span>
    </div>
  )
}

function FunnelCard({
  portfolio,
}: {
  portfolio: { views: { total: number; known: number }; saves: { total: number; known: number }; inquiries: { total: number; known: number } }
}) {
  const max = Math.max(portfolio.views.total, 1)
  if (portfolio.views.known === 0) return null
  return (
    <div className="rounded-[22px] border border-border-app bg-white p-5 card-shadow">
      <div className="mb-4 flex items-center gap-2">
        <Chart2 size={18} color="currentColor" className="text-primary" />
        <h2 className="font-black text-navy">משפך המעורבות — כל התיק</h2>
      </div>
      <div className="flex flex-col gap-3">
        <FunnelBar label="צפיות" value={portfolio.views.total} max={max} color={FUNNEL_STEPS[0]} formatted={compact(portfolio.views.total)} />
        <FunnelBar label="שמירות" value={portfolio.saves.total} max={max} color={FUNNEL_STEPS[1]} formatted={portfolio.saves.known > 0 ? compact(portfolio.saves.total) : '—'} />
        <FunnelBar label="פניות" value={portfolio.inquiries.total} max={max} color={FUNNEL_STEPS[2]} formatted={portfolio.inquiries.known > 0 ? compact(portfolio.inquiries.total) : '—'} />
      </div>
    </div>
  )
}

// ═════════════════════════ Property ranking (nominal) ════════════════════════

function RankingCard({ cards }: { cards: ListingHealth[] }) {
  const ranked = useMemo(
    () =>
      [...cards]
        .filter((c) => c.views != null)
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
        .slice(0, 8),
    [cards],
  )
  if (ranked.length === 0) {
    return (
      <div className="rounded-[22px] border border-border-app bg-white p-5 card-shadow">
        <h2 className="font-black text-navy">דירות לפי צפיות</h2>
        <p className="mt-2 text-[13px] text-secondary-text">עדיין אין נתוני צפיות זמינים.</p>
      </div>
    )
  }
  const max = ranked[0].views ?? 1
  return (
    <div className="rounded-[22px] border border-border-app bg-white p-5 card-shadow">
      <h2 className="mb-4 font-black text-navy">דירות לפי צפיות</h2>
      <div className="flex flex-col gap-3">
        {ranked.map((c) => {
          const pct = Math.max(4, Math.round(((c.views ?? 0) / max) * 100))
          return (
            <Link key={c.property.id} href={`/listing/${c.property.id}`} className="group flex items-center gap-3">
              <span className="w-24 shrink-0 truncate text-[12.5px] font-bold text-navy group-hover:text-primary">
                {addressLabel(c.property)}
              </span>
              <div className="h-5 min-w-0 flex-1 rounded-full bg-cloud">
                <div
                  className="h-5 rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: NOMINAL_HUE, minWidth: '1.5rem' }}
                />
              </div>
              <span className="w-10 shrink-0 text-end text-[12.5px] font-black tabular-nums text-navy">
                {c.views}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════ Price positioning (status) ══════════════════════

function PriceTiersCard({ portfolio, total }: { portfolio: { tiers: Record<string, number> }; total: number }) {
  const classified = portfolio.tiers.great_deal + portfolio.tiers.fair + portfolio.tiers.above_market
  return (
    <div className="rounded-[22px] border border-border-app bg-white p-5 card-shadow">
      <h2 className="mb-1 font-black text-navy">מיצוב מחיר מול האזור</h2>
      <p className="mb-4 text-[12px] font-semibold text-secondary-text">
        {classified > 0 ? `${classified} מתוך ${total} דירות עם נתוני מחיר אזורי` : 'אין עדיין נתוני מיצוב מחיר'}
      </p>
      {classified === 0 ? (
        <p className="text-[13px] text-secondary-text">המיצוב יופיע כאן ברגע שיהיו מספיק דירות דומות באזור להשוואה.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {(['great_deal', 'fair', 'above_market'] as const).map((tier) => {
            const meta = PRICE_TIERS[tier]
            const count = portfolio.tiers[tier]
            if (count === 0) return null
            return (
              <div
                key={tier}
                className="flex items-center justify-between rounded-xl px-3.5 py-2.5"
                style={{ backgroundColor: meta.bg }}
              >
                <span className="flex items-center gap-2 text-[13px] font-bold" style={{ color: meta.fg }}>
                  <meta.Icon size={16} color={meta.fg} variant="Bold" />
                  {meta.label}
                </span>
                <span className="text-[14px] font-black" style={{ color: meta.fg }}>
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════ Audience rollup (nominal) ═══════════════════════

function AudienceRollupCard({ audience }: { audience: AudienceBreakdown }) {
  if (audience.suppressed) {
    return (
      <div className="rounded-[22px] border border-border-app bg-white p-5 text-center card-shadow">
        <UserOctagon size={22} color="currentColor" className="mx-auto text-secondary-text" />
        <p className="mt-2 font-black text-navy">{audience.total} מתעניינים בכל התיק עד כה</p>
        <p className="mt-1 text-[12.5px] text-secondary-text">
          פילוח קהל מוצג רק כשיש לפחות {K_ANON} מתעניינים — כמעט שם.
        </p>
      </div>
    )
  }
  const max = audience.segments[0]?.count ?? 1
  return (
    <div className="rounded-[22px] border border-border-app bg-white p-5 card-shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-black text-navy">
          <UserOctagon size={18} color="currentColor" className="text-primary" />
          קהל — כל התיק ({audience.total} מתעניינים)
        </h2>
      </div>
      <div className="flex flex-col gap-2.5">
        {audience.segments.slice(0, 8).map((s) => {
          const pct = Math.max(4, Math.round((s.count / max) * 100))
          return (
            <div key={s.key} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-[12.5px] font-bold text-navy">{s.label}</span>
              <div className="h-4 min-w-0 flex-1 rounded-full bg-cloud">
                <div className="h-4 rounded-full" style={{ width: `${pct}%`, backgroundColor: NOMINAL_HUE, minWidth: '1rem' }} />
              </div>
              <span className="w-8 shrink-0 text-end text-[12px] font-black tabular-nums text-navy">{s.count}</span>
            </div>
          )
        })}
      </div>
      <p className="mt-4 border-t border-border-app pt-3 text-[11px] leading-relaxed text-secondary-text">
        לעולם לא מפולח לפי דת, מוצא, גיל או הכנסה — רק סוג משק בית, שלב בחיים, תקציב ומאפייני אורח חיים, ורק
        בקבוצות של {K_ANON} ומעלה.
      </p>
    </div>
  )
}

// ══════════════════════════════ Comparison table ═════════════════════════════

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 text-[12px] font-bold transition ${active ? 'text-primary' : 'text-secondary-text hover:text-navy'}`}
    >
      {label}
      {active && (dir === 'desc' ? <ArrowDown2 size={13} color="currentColor" /> : <ArrowUp2 size={13} color="currentColor" />)}
    </button>
  )
}

function ComparisonTable({
  cards,
  sort,
  onSort,
}: {
  cards: ListingHealth[]
  sort: { key: SortKey; dir: SortDir }
  onSort: (s: { key: SortKey; dir: SortDir }) => void
}) {
  function toggle(key: SortKey) {
    onSort({ key, dir: sort.key === key && sort.dir === 'desc' ? 'asc' : 'desc' })
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-border-app bg-white card-shadow">
      <div className="border-b border-border-app p-5">
        <h2 className="font-black text-navy">כל הדירות — השוואה מלאה</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-border-app bg-cloud/60 text-start">
              <th className="px-4 py-3 text-start font-bold text-secondary-text">דירה</th>
              <th className="px-3 py-3 text-start font-bold text-secondary-text">מצב</th>
              <th className="px-3 py-3 text-end">
                <SortHeader label="מחיר" active={sort.key === 'price'} dir={sort.dir} onClick={() => toggle('price')} />
              </th>
              <th className="px-3 py-3 text-end">
                <SortHeader label="צפיות" active={sort.key === 'views'} dir={sort.dir} onClick={() => toggle('views')} />
              </th>
              <th className="px-3 py-3 text-end">
                <SortHeader label="שמירות" active={sort.key === 'saves'} dir={sort.dir} onClick={() => toggle('saves')} />
              </th>
              <th className="px-3 py-3 text-end">
                <SortHeader label="פניות" active={sort.key === 'inquiries'} dir={sort.dir} onClick={() => toggle('inquiries')} />
              </th>
              <th className="px-3 py-3 text-end">
                <SortHeader label="ימים בשוק" active={sort.key === 'daysOnMarket'} dir={sort.dir} onClick={() => toggle('daysOnMarket')} />
              </th>
              <th className="px-4 py-3 text-start font-bold text-secondary-text">מיצוב מחיר</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => {
              const meta = STATE_META[c.state]
              const badge = String(c.priceBadge?.badge ?? '').toLowerCase()
              const tier = PRICE_TIERS[badge]
              const img = primaryImage(c.property)
              return (
                <tr key={c.property.id} className="border-b border-border-app last:border-0 hover:bg-cloud/40">
                  <td className="px-4 py-3">
                    <Link href={`/listing/${c.property.id}`} className="flex items-center gap-2.5 hover:text-primary">
                      <div className="h-9 w-11 shrink-0 overflow-hidden rounded-lg bg-cloud">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-secondary-text">
                            <Building size={14} variant="Bulk" color="currentColor" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-bold text-navy">{addressLabel(c.property)}</div>
                        <div className="truncate text-[11px] text-secondary-text">{cityLabel(c.property)}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.cls}`}>
                      <meta.Icon size={11} color="currentColor" variant="Bold" />
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-end font-bold tabular-nums text-navy">{priceLabel(c.property)}</td>
                  <td className="px-3 py-3 text-end tabular-nums text-navy">{c.views ?? '—'}</td>
                  <td className="px-3 py-3 text-end tabular-nums text-navy">
                    <span className="inline-flex items-center gap-1">
                      {c.saves != null && c.saves > 0 && <Heart size={11} color="#FF5A67" variant="Bold" />}
                      {c.saves ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-end tabular-nums text-navy">{c.inquiries ?? '—'}</td>
                  <td className="px-3 py-3 text-end tabular-nums text-navy">{c.daysOnMarket ?? '—'}</td>
                  <td className="px-4 py-3">
                    {tier ? (
                      <span className="flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: tier.bg, color: tier.fg }}>
                        <tier.Icon size={11} color={tier.fg} variant="Bold" />
                        {tier.label}
                      </span>
                    ) : (
                      <span className="text-[11px] text-secondary-text">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

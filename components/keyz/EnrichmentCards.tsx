'use client'

// Web port of the app's two listing-enrichment widgets, rendered in the app's
// order (price badge → neighborhood score), right above "מה יש בסביבה":
//
//   • PriceBadge            — lib/presentation/widgets/price_badge.dart
//   • NeighborhoodScoreCard — lib/presentation/widgets/neighborhood_score_card.dart
//
// Both read the enrichment map defensively (absent / partial / odd types) and
// render nothing when there is nothing honest to show — same fail-soft behavior
// as the app. The Dart bottom-sheet breakdown becomes an in-card expandable
// section (rows + bars + data sources) since the web has no modal sheet idiom here.

import { useEffect, useState } from 'react'
import {
  ArrowDown2,
  ArrowLeft2,
  DocumentText,
  InfoCircle,
  Location,
  TickCircle,
  TrendDown,
  TrendUp,
  type Icon,
} from 'iconsax-react'
import {
  fetchListingEnrichment,
  type ListingEnrichment,
  type NeighborhoodScoreData,
  type PriceBadgeData,
} from '@/lib/live/enrichment'

// ── App palette (AppColors) values the two Dart widgets use ─────────────────
const SCORE_STRONG = '#15803D' // scoreStrong (successDeep) — ≥80
const SCORE_GOOD = '#1D4ED8' // scoreGood (infoDeep) — 60–79
const SCORE_MIXED = '#C2410C' // scoreMixed (warningDeep) — 40–59
const SLATE_400 = '#94A3B8' // low (<40)
const SLATE_100 = '#F1F5F9' // chip / bar track / "fair" badge bg
const SLATE_700 = '#334155' // chip text
const TEAL_PALE = '#EFF6FF' // "great_deal" badge bg
const CLOUD = '#F5F7FA' // "above_market" badge bg

// v ≥80 strong · 60–79 good · 40–59 mixed · else low — same thresholds as the app.
function tierColor(v: number): string {
  if (v >= 80) return SCORE_STRONG
  if (v >= 60) return SCORE_GOOD
  if (v >= 40) return SCORE_MIXED
  return SLATE_400
}

// Dart _toDouble: num → double, string → tryParse, else null.
function toDouble(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const n = parseFloat(v.trim())
    return Number.isNaN(n) ? null : n
  }
  return null
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

// fg color at the Dart alpha values (border 0.22, secondary text 0.85, /100 0.7, badge bg 0.12).
function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0')
  return `${hex}${a}`
}

// ═════════════════════════════ PriceBadge ═══════════════════════════════════

interface BadgeStyle {
  label: string
  fg: string
  bg: string
  icon: Icon
}

// Same three verdict styles as price_badge.dart _styleFor (unknown → "fair").
function styleFor(badge: string): BadgeStyle {
  switch (badge) {
    case 'great_deal':
      return { label: 'מחיר מצוין לאזור', fg: SCORE_STRONG, bg: TEAL_PALE, icon: TrendDown }
    case 'above_market':
      return { label: 'מעל מחיר השוק', fg: SCORE_MIXED, bg: CLOUD, icon: TrendUp }
    default: // 'fair' and any unknown-but-present verdict → neutral, calm blue.
      return { label: 'מחיר הוגן לאזור', fg: SCORE_GOOD, bg: SLATE_100, icon: TickCircle }
  }
}

// Dart _badgeMap: nested `priceBadge` sub-map, or the map itself if it already
// carries priceBadge keys.
function badgeMap(raw: ListingEnrichment | null): PriceBadgeData | null {
  if (!raw) return null
  const nested = asRecord(raw.priceBadge)
  if (nested) return nested as PriceBadgeData
  if ('badge' in raw || 'deltaPct' in raw || 'medianPpm' in raw) return raw as PriceBadgeData
  return null
}

function PriceBadge({ enrichment }: { enrichment: ListingEnrichment | null }) {
  const map = badgeMap(enrichment)
  if (!map) return null

  const badge = map.badge == null ? null : String(map.badge).trim().toLowerCase()
  // No usable verdict, or explicitly not enough comps → render nothing.
  if (!badge || badge === 'insufficient_data') return null

  const medianPpm = toDouble(map.medianPpm)
  const deltaPct = toDouble(map.deltaPct)
  const style = styleFor(badge)
  const BadgeIcon = style.icon

  // Comparison line built defensively: median alone, delta alone, or both.
  const parts: string[] = []
  if (medianPpm != null && medianPpm > 0) parts.push(`₪${Math.round(medianPpm).toLocaleString('en-US')}/מ״ר`)
  if (deltaPct != null && Math.abs(deltaPct) >= 1) {
    const pct = Math.round(Math.abs(deltaPct))
    parts.push(deltaPct < 0 ? `−${pct}% מתחת לחציון האזור` : `+${pct}% מעל חציון האזור`)
  } else if (deltaPct != null) {
    parts.push('סביב חציון האזור')
  }
  const detail = parts.join(' · ')

  return (
    <div
      className="inline-flex items-center gap-2 rounded-2xl border px-3.5 py-[11px]"
      style={{ backgroundColor: style.bg, borderColor: withAlpha(style.fg, 0.22) }}
    >
      <BadgeIcon size={18} color={style.fg} className="shrink-0" />
      <div className="min-w-0">
        <div className="text-[13.5px] font-black" style={{ color: style.fg }}>
          {style.label}
        </div>
        {detail && (
          <div className="mt-0.5 text-[12px] font-semibold leading-[1.3]" style={{ color: withAlpha(style.fg, 0.85) }}>
            {detail}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════ NeighborhoodScoreCard ══════════════════════════════

// Hebrew labels for the known sub-scores, in canonical display order.
const SUB_LABELS: Record<string, string> = {
  safety: 'בטיחות',
  walkability: 'הליכתיות',
  schools: 'בתי״ס',
  transit: 'תחבורה',
  green: 'ירוק',
}

// Each sub-score → its honest data source (the app's GovSources registry values;
// walkability maps to the 'convenience' gov dimension, exactly as in the Dart).
const SUB_SOURCES: Record<string, { agency: string; dataset: string }> = {
  safety: { agency: 'משטרת ישראל / למ״ס', dataset: 'עבירות פליליות שנרשמו (לנפש)' },
  walkability: { agency: 'OpenStreetMap / data.gov.il', dataset: 'סופרמרקטים ומרכזי קניות' },
  schools: { agency: 'למ״ס / משרד החינוך', dataset: 'מוסדות חינוך' },
  transit: { agency: 'רכבת ישראל', dataset: 'מיקומי תחנות רכבת' },
  green: { agency: 'OpenStreetMap / data.gov.il', dataset: 'פארקים ושטחים ירוקים' },
}

function sourceLabel(key: string): string | null {
  const s = SUB_SOURCES[key]
  return s ? `${s.agency} — ${s.dataset}` : null
}

// Dart _scoreMap: nested `neighborhoodScore`, or the map itself if it carries score/sub.
function scoreMap(raw: ListingEnrichment | null): NeighborhoodScoreData | null {
  if (!raw) return null
  const nested = asRecord(raw.neighborhoodScore)
  if (nested) return nested as NeighborhoodScoreData
  if ('score' in raw || 'sub' in raw) return raw as NeighborhoodScoreData
  return null
}

type SubScore = { key: string; value: number }

// Known keys in canonical order first, then unknown backend-added keys; >0 only,
// rounded and clamped 0..100 — mirrors the Dart collection loop.
function collectSubs(map: NeighborhoodScoreData): SubScore[] {
  const subRaw = asRecord(map.sub)
  const subs: SubScore[] = []
  if (subRaw) {
    for (const key of Object.keys(SUB_LABELS)) {
      const v = toDouble(subRaw[key])
      if (v != null && v > 0) subs.push({ key, value: Math.min(100, Math.max(0, Math.round(v))) })
    }
    for (const [k, rawV] of Object.entries(subRaw)) {
      if (k in SUB_LABELS) continue
      const v = toDouble(rawV)
      if (v != null && v > 0) subs.push({ key: k, value: Math.min(100, Math.max(0, Math.round(v))) })
    }
  }
  return subs
}

function HeadlineBadge({ score }: { score: number }) {
  const color = tierColor(score)
  return (
    <span
      className="flex items-baseline rounded-full px-3 py-1.5"
      style={{ backgroundColor: withAlpha(color, 0.12) }}
    >
      <span className="text-[20px] font-black leading-none" style={{ color }}>
        {score}
      </span>
      <span className="mr-0.5 text-[12px] font-bold" style={{ color: withAlpha(color, 0.7) }}>
        /100
      </span>
    </span>
  )
}

function BreakdownRow({ label, value, source }: { label: string; value: number; source: string | null }) {
  const color = tierColor(value)
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[14.5px] font-extrabold text-navy">{label}</span>
        <span className="text-[14.5px] font-black" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="mt-1.5 h-[7px] overflow-hidden rounded-full" style={{ backgroundColor: SLATE_100 }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      {source && <div className="mt-1 text-[11.5px] text-secondary-text">{source}</div>}
    </div>
  )
}

function NeighborhoodScoreCard({ enrichment }: { enrichment: ListingEnrichment | null }) {
  const [open, setOpen] = useState(false)

  const map = scoreMap(enrichment)
  if (!map) return null

  const headline = toDouble(map.score)
  const subs = collectSubs(map)
  const hasHeadline = headline != null && headline > 0
  if (!hasHeadline && subs.length === 0) return null

  const headlineInt = hasHeadline ? Math.min(100, Math.max(0, Math.round(headline))) : null
  const topSubs = [...subs].sort((a, b) => b.value - a.value)
  const chips = topSubs.slice(0, 3)

  // Sources actually cited (deduped by label) for the footer.
  const sources: string[] = []
  for (const s of topSubs) {
    const src = sourceLabel(s.key)
    if (src && !sources.includes(src)) sources.push(src)
  }

  return (
    <div className="rounded-[28px] border border-border-app bg-white p-5 card-shadow">
      <button type="button" onClick={() => setOpen((v) => !v)} className="block w-full text-right">
        <div className="flex items-center gap-2">
          <Location size={20} color="#2563EB" className="shrink-0" />
          <span className="text-[16px] font-black text-navy">ציון השכונה</span>
          <span className="flex-1" />
          {headlineInt != null && <HeadlineBadge score={headlineInt} />}
        </div>
        {chips.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            {chips.map((c) => (
              <span
                key={c.key}
                className="rounded-full px-3 py-2 text-[13px] font-extrabold"
                style={{ backgroundColor: SLATE_100, color: SLATE_700 }}
              >
                {SUB_LABELS[c.key] ?? c.key} {c.value}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-1.5">
          <InfoCircle size={14} color="#2563EB" className="shrink-0" />
          <span className="text-[12.5px] font-bold text-primary">הצג פירוט ומקורות</span>
          <span className="flex-1" />
          {open ? <ArrowDown2 size={16} color="#2563EB" /> : <ArrowLeft2 size={16} color="#2563EB" />}
        </div>
      </button>

      {/* The app's bottom-sheet breakdown, inlined: every sub-score as a labeled
          bar + the honest data source behind it. */}
      {open && (
        <div className="mt-4 border-t border-border-app pt-4">
          <p className="text-[13px] leading-[1.4] text-secondary-text">
            הציון הכולל הוא ממוצע משוקלל של הפרמטרים הבאים, המחושבים מנתונים ציבוריים ונקודות עניין באזור.
          </p>
          <div className="mt-4 flex flex-col gap-3.5">
            {topSubs.length === 0 ? (
              <p className="text-secondary-text">אין עדיין פירוט זמין לאזור זה.</p>
            ) : (
              topSubs.map((s) => (
                <BreakdownRow
                  key={s.key}
                  label={SUB_LABELS[s.key] ?? s.key}
                  value={s.value}
                  source={SUB_SOURCES[s.key]?.dataset ?? null}
                />
              ))
            )}
          </div>
          {sources.length > 0 && (
            <div className="mt-4 border-t border-border-app pt-3.5">
              <div className="flex items-center gap-1.5">
                <DocumentText size={16} color="#5B7A99" className="shrink-0" />
                <span className="text-[13.5px] font-extrabold text-navy">מקורות הנתונים</span>
              </div>
              <div className="mt-2 flex flex-col gap-1.5">
                {sources.map((src) => (
                  <div key={src} className="text-[12.5px] leading-[1.4] text-secondary-text">
                    • {src}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════ wrapper ══════════════════════════════════════

// Fetches the listing enrichment once and renders the price badge + neighborhood
// score in the app's order. Renders nothing while loading or when absent.
export default function EnrichmentCards({ listingId }: { listingId: string }) {
  const [enrichment, setEnrichment] = useState<ListingEnrichment | null>(null)

  useEffect(() => {
    let cancelled = false
    setEnrichment(null)
    fetchListingEnrichment(listingId).then((e) => {
      if (!cancelled) setEnrichment(e)
    })
    return () => {
      cancelled = true
    }
  }, [listingId])

  if (!enrichment) return null

  // Same visibility rules as the widgets themselves — only mount the section
  // when at least one of them will actually paint.
  const badge = badgeMap(enrichment)
  const badgeVerdict = badge?.badge == null ? '' : String(badge.badge).trim().toLowerCase()
  const showBadge = !!badge && !!badgeVerdict && badgeVerdict !== 'insufficient_data'
  const score = scoreMap(enrichment)
  const showScore =
    !!score && ((toDouble(score.score) ?? 0) > 0 || collectSubs(score).length > 0)
  if (!showBadge && !showScore) return null

  return (
    <div className="mt-8 flex flex-col items-start gap-4">
      {showBadge && <PriceBadge enrichment={enrichment} />}
      {showScore && (
        <div className="w-full">
          <NeighborhoodScoreCard enrichment={enrichment} />
        </div>
      )}
    </div>
  )
}

'use client'

// Full filter sidebar — 1:1 port of the app's _FiltersSheet (discover_screen.dart)
// section structure and Hebrew labels, minus מיון (it lives in the page top bar)
// and minus the app's preferred/required double-tap tiers: web chips are a
// single "must-have" toggle, and every change applies instantly.
//
// Every option carries a live result count computed with its OWN facet cleared
// (see facetCounts in ./filters), so the user can see that e.g. "תיווך בלבד"
// would give 0 results BEFORE clicking it — today no live row is flagged
// agencyListing, and the old UI just silently emptied the page.

import { useMemo, useState } from 'react'
import {
  Building,
  Buildings,
  Briefcase,
  Bus,
  Calendar1,
  Car,
  CloseCircle,
  Cup,
  Drop,
  EmojiHappy,
  Filter,
  Gallery,
  Game,
  Health,
  Heart,
  Home2,
  Hospital,
  Location,
  Maximize4,
  Money,
  Pet,
  Profile2User,
  Reserve,
  SearchNormal1,
  ShieldTick,
  ShoppingCart,
  Teacher,
  Tree,
  Weight,
} from 'iconsax-react'
import type { Icon } from 'iconsax-react'
import type { Property } from '@/lib/live/types'
import DualRange from './DualRange'
import {
  FEATURE_CATALOG,
  LISTING_SOURCE_OPTIONS,
  MOVE_IN_OPTIONS,
  NEARBY_OPTIONS,
  QUICK_CITIES,
  ROOM_CHIPS,
  SIZE_SLIDER_MAX,
  TRANSACTION_OPTIONS,
  UNSET_MAX_ROOMS,
  type WebFilters,
  canonicalFeatureKey,
  decodeStringList,
  facetCounts,
  formatPrice,
  formatSize,
  nearbyHasSignal,
  priceBounds,
  sectionCounts,
  toggleValue,
  withTransaction,
} from './filters'

const NEARBY_ICONS: Record<string, Icon> = {
  schools: Teacher,
  kindergartens: EmojiHappy,
  playgrounds: Game,
  parks: Tree,
  supermarkets: ShoppingCart,
  clinics: Hospital,
  pharmacies: Health,
  hospitals: Heart,
  transit: Bus,
  gyms: Weight,
  pools: Drop,
  dining: Reserve,
  nightlife: Cup,
  culture: Gallery,
  synagogues: Buildings,
  dogParks: Pet,
  coworking: Briefcase,
  parking: Car,
}

function Section({
  title,
  icon: IconCmp,
  badge,
  children,
  first,
}: {
  title: string
  icon: Icon
  badge?: number
  children: React.ReactNode
  first?: boolean
}) {
  return (
    // break-inside-avoid keeps a section whole when the panel flows into
    // multiple CSS columns on wide screens.
    <section
      className={`break-inside-avoid ${first ? 'pt-1' : 'border-t border-border-app pt-5'} mb-5 last:mb-0`}
    >
      <div className="mb-3 flex items-center gap-2">
        <IconCmp size={16} color="#072946" />
        <h3 className="text-[14px] font-black text-navy">{title}</h3>
        {badge ? (
          <span className="min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[11px] font-black leading-none text-white">
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function Chip({
  label,
  selected,
  onClick,
  icon: IconCmp,
  count,
  title,
}: {
  label: string
  selected: boolean
  onClick: () => void
  icon?: Icon
  /** Live result count for this option — undefined hides the badge. */
  count?: number
  title?: string
}) {
  // An option that cannot return anything is still clickable (so a stuck
  // selection can be cleared) but is visibly dimmed instead of pretending.
  const empty = count === 0 && !selected
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={title}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition ${
        selected
          ? 'border-primary bg-primary text-white'
          : empty
            ? 'border-border-app bg-white text-secondary-text/60 hover:border-primary/40'
            : 'border-border-app bg-white text-navy hover:border-primary/40'
      }`}
    >
      {IconCmp ? <IconCmp size={14} color={selected ? '#FFFFFF' : '#072946'} /> : null}
      {label}
      {count !== undefined && (
        <span className={`text-[11px] font-black ${selected ? 'text-white/70' : 'text-secondary-text'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

export default function FilterSidebar({
  items,
  filters,
  onChange,
  onClear,
  footer,
}: {
  items: Property[]
  filters: WebFilters
  onChange: (next: WebFilters) => void
  onClear: () => void
  /** Rendered full-width under the sections (the panel's close button). */
  footer?: React.ReactNode
}) {
  const f = filters
  const counts = sectionCounts(f)
  const bounds = priceBounds(f.transactionType)
  const [cityQuery, setCityQuery] = useState('')

  // One memoised facet pass for the whole sidebar. Previously the transaction
  // row alone re-ran three full filter passes on EVERY render (i.e. on every
  // keystroke in the search box), unmemoised.
  const facets = useMemo(() => facetCounts(items, f), [items, f])

  // Derived option lists — same idea as the app's availablePropertyTypes /
  // availableConditions / availableCities (built from the live catalogue).
  const availablePropertyTypes = useMemo(
    () => [...new Set(items.map((p) => (p.propertyType ?? '').trim()).filter(Boolean))].sort(),
    [items],
  )
  const availableConditions = useMemo(
    () => [...new Set(items.map((p) => (p.condition ?? '').trim()).filter(Boolean))].sort(),
    [items],
  )
  const availableCities = useMemo(
    () => [...new Set(items.map((p) => (p.city ?? '').trim()).filter(Boolean))].sort(),
    [items],
  )

  // Feature chips: catalogue labels ∪ Hebrew labels found on live properties
  // (availableFeatures parity). The live rows encode `features` / `featureLabels`
  // as JSON STRINGS — decodeStringList unpacks them. Reading them as arrays used
  // to spread the raw string into single CHARACTERS, which is why this list
  // filled up with one-letter Hebrew "features".
  const featureChips = useMemo(() => {
    const byKey = new Map<string, string>()
    for (const def of FEATURE_CATALOG) byKey.set(def.key, def.label)
    for (const p of items) {
      const row = p as unknown as Record<string, unknown>
      const raw = [...decodeStringList(row.features), ...decodeStringList(row.featureLabels)]
      for (const label of raw) {
        const key = canonicalFeatureKey(label)
        if (!byKey.has(key) && /[֐-׿]/.test(label)) byKey.set(key, label.trim())
      }
    }
    return [...byKey.entries()]
      .map(([key, label]) => ({ key, label, count: facets.feature[key] ?? 0 }))
      // Options that exist in the live catalogue first, then alphabetically —
      // a 46-chip wall where most match nothing is not a usable filter.
      .sort((a, b) => (b.count > 0 ? 1 : 0) - (a.count > 0 ? 1 : 0) || a.label.localeCompare(b.label, 'he'))
  }, [items, facets])

  const [showAllFeatures, setShowAllFeatures] = useState(false)
  const visibleFeatureChips = useMemo(() => {
    if (showAllFeatures) return featureChips
    return featureChips.filter((c) => c.count > 0 || f.requiredFeatures.includes(c.key))
  }, [featureChips, showAllFeatures, f.requiredFeatures])

  const citySuggestions = useMemo(() => {
    const q = cityQuery.trim().toLowerCase()
    if (!q) return []
    return availableCities.filter((c) => c.toLowerCase().includes(q)).slice(0, 12)
  }, [availableCities, cityQuery])

  // Rooms chips: first tap sets an exact value, tapping outside the range
  // extends it, tapping inside clears.
  const roomsSelected = f.minRooms > 0 || f.maxRooms < UNSET_MAX_ROOMS
  const effMax = f.maxRooms >= UNSET_MAX_ROOMS ? 6 : f.maxRooms
  const onRoomChip = (v: number) => {
    if (!roomsSelected) {
      onChange({ ...f, minRooms: v, maxRooms: v === 6 ? UNSET_MAX_ROOMS : v })
    } else if (v < f.minRooms) {
      onChange({ ...f, minRooms: v })
    } else if (v > effMax) {
      onChange({ ...f, maxRooms: v === 6 ? UNSET_MAX_ROOMS : v })
    } else {
      onChange({ ...f, minRooms: 0, maxRooms: UNSET_MAX_ROOMS })
    }
  }

  const setCity = (city: string) => {
    const next = f.city === city ? '' : city
    setCityQuery(next)
    onChange({ ...f, city: next })
  }

  return (
    <div className="rounded-3xl border border-border-app bg-white p-4 card-shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-black text-navy">סינון מתקדם</h2>
        <button
          type="button"
          onClick={onClear}
          className="text-[12.5px] font-bold text-secondary-text transition hover:text-coral"
        >
          נקה הכל
        </button>
      </div>

      {/* The panel is full-width inside the results column, so let the sections
          flow into 2–3 CSS columns instead of one very tall stack. */}
      <div className="columns-1 gap-x-6 md:columns-2 2xl:columns-3">
      {/* ── מטרה ── */}
      <Section title="מטרה" icon={Filter} badge={counts.transaction} first>
        <div className="grid grid-cols-3 gap-2">
          {TRANSACTION_OPTIONS.map((opt) => {
            const selected = f.transactionType === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(withTransaction(f, opt.value))}
                className={`rounded-2xl border px-2 py-2.5 text-center transition ${
                  selected
                    ? 'border-primary bg-primary-light2'
                    : 'border-border-app bg-white hover:border-primary/40'
                }`}
              >
                <span className={`block text-[13px] font-black ${selected ? 'text-primary' : 'text-navy'}`}>
                  {opt.label}
                </span>
                <span className="block text-[11px] font-bold text-secondary-text">
                  {facets.transaction[opt.value] ?? 0} דירות
                </span>
              </button>
            )
          })}
        </div>
      </Section>

      {/* ── טווח מחירים ── */}
      <Section title="טווח מחירים" icon={Money} badge={counts.price}>
        <DualRange
          label="טווח מחירים"
          min={bounds.min}
          max={bounds.max}
          step={bounds.step}
          valueMin={f.minBudget}
          valueMax={f.maxBudget}
          onChange={(minBudget, maxBudget) => onChange({ ...f, minBudget, maxBudget })}
          format={formatPrice}
          maxLabel="ללא הגבלה"
        />
        <label className="mt-3 flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={f.includeUnknownPriceListings}
            onChange={(e) => onChange({ ...f, includeUnknownPriceListings: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-[#2563EB]"
          />
          <span>
            <span className="block text-[12.5px] font-extrabold text-navy">לכלול דירות בלי מחיר</span>
            <span className="block text-[11px] font-semibold text-secondary-text">
              מחיר מתחת ל-600 ש&quot;ח נחשב כלא ידוע
            </span>
          </span>
        </label>
      </Section>

      {/* ── חדרים ── */}
      <Section title="חדרים" icon={Home2} badge={counts.rooms}>
        <div className="flex flex-wrap gap-1.5">
          {ROOM_CHIPS.map((chip) => {
            const inRange = roomsSelected && chip.value >= f.minRooms && chip.value <= effMax
            return (
              <button
                key={chip.value}
                type="button"
                aria-pressed={inRange}
                aria-label={`${chip.label} חדרים`}
                onClick={() => onRoomChip(chip.value)}
                className={`min-w-9 rounded-full border px-2 py-1.5 text-[12.5px] font-bold transition ${
                  inRange
                    ? 'border-primary bg-primary text-white'
                    : 'border-border-app bg-white text-navy hover:border-primary/40'
                }`}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
        {roomsSelected && (
          <p className="mt-2 text-[11px] font-bold text-secondary-text">
            {f.maxRooms >= UNSET_MAX_ROOMS ? `${f.minRooms}+ חדרים` : `${f.minRooms}–${f.maxRooms} חדרים`}
            {' · '}לחיצה בתוך הטווח מנקה
          </p>
        )}
      </Section>

      {/* ── מיקום ── */}
      <Section title="מיקום" icon={Location} badge={counts.location}>
        <label className="flex items-center gap-2 rounded-2xl border border-border-app bg-white px-3 py-2.5">
          <SearchNormal1 size={15} color="#5B7A99" />
          <input
            type="text"
            value={cityQuery}
            onChange={(e) => setCityQuery(e.target.value)}
            placeholder="חפש עיר או אזור"
            aria-label="חפש עיר או אזור"
            className="w-full bg-transparent text-[13px] font-bold text-navy outline-none placeholder:text-secondary-text"
          />
          {(cityQuery || f.city) && (
            <button
              type="button"
              aria-label="נקה עיר"
              onClick={() => {
                setCityQuery('')
                onChange({ ...f, city: '' })
              }}
            >
              <CloseCircle size={16} color="#5B7A99" />
            </button>
          )}
        </label>
        {citySuggestions.length > 0 && cityQuery.trim() !== f.city && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-border-app bg-white">
            {citySuggestions.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setCity(city)}
                className={`flex w-full items-center justify-between px-3 py-2 text-right text-[13px] font-bold transition hover:bg-cloud ${
                  f.city === city ? 'bg-primary-light2 text-primary' : 'text-navy'
                }`}
              >
                <span>{city}</span>
                <span className="text-[11px] font-black text-secondary-text">{facets.city[city] ?? 0}</span>
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_CITIES.map((city) => (
            <Chip
              key={city}
              label={city}
              count={facets.city[city] ?? 0}
              selected={f.city === city}
              onClick={() => setCity(city)}
            />
          ))}
        </div>
      </Section>

      {/* ── טווח גודל ── */}
      <Section title="טווח גודל" icon={Maximize4} badge={counts.size}>
        <DualRange
          label="טווח גודל"
          min={0}
          max={SIZE_SLIDER_MAX}
          step={10}
          valueMin={f.minSizeM2}
          valueMax={Math.min(f.maxSizeM2, SIZE_SLIDER_MAX)}
          onChange={(minSizeM2, maxSizeM2) => onChange({ ...f, minSizeM2, maxSizeM2 })}
          format={formatSize}
          maxLabel="2,000+ מ״ר"
        />
        <p className="mt-1 text-[11px] font-semibold text-secondary-text">
          דירות ללא נתון שטח לא יוצגו כשמגדירים גודל מינימלי
        </p>
      </Section>

      {/* ── קומה מינימלית (the app filters by minimum floor only) ── */}
      <Section title="קומה מינימלית" icon={Building} badge={counts.floor}>
        <select
          value={f.minFloor}
          onChange={(e) => onChange({ ...f, minFloor: Number(e.target.value) })}
          aria-label="קומה מינימלית"
          className="w-full rounded-2xl border border-border-app bg-white px-3 py-2.5 text-[13px] font-bold text-navy"
        >
          <option value={0}>ללא הגבלה</option>
          {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              קומה {n}+
            </option>
          ))}
        </select>
      </Section>

      {/* ── סוג נכס ── */}
      <Section title="סוג נכס" icon={Buildings} badge={counts.propertyType}>
        {availablePropertyTypes.length === 0 ? (
          <p className="text-[12px] font-semibold text-secondary-text">אין נתוני סוג נכס בקטלוג הנוכחי</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {availablePropertyTypes.map((type) => (
              <Chip
                key={type}
                label={type}
                icon={Building}
                count={facets.propertyType[type] ?? 0}
                selected={f.propertyTypes.includes(type)}
                onClick={() => onChange({ ...f, propertyTypes: toggleValue(f.propertyTypes, type) })}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ── מצב הנכס ── */}
      <Section title="מצב הנכס" icon={ShieldTick} badge={counts.condition}>
        {availableConditions.length === 0 ? (
          <p className="text-[12px] font-semibold text-secondary-text">אין נתוני מצב נכס בקטלוג הנוכחי</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {availableConditions.map((condition) => (
                <Chip
                  key={condition}
                  label={condition}
                  count={facets.condition[condition] ?? 0}
                  selected={f.conditions.includes(condition)}
                  onClick={() => onChange({ ...f, conditions: toggleValue(f.conditions, condition) })}
                />
              ))}
            </div>
            <p className="mt-2 text-[11px] font-semibold text-secondary-text">
              רוב המודעות לא מציינות מצב נכס — בחירה כאן תסתיר אותן
            </p>
          </>
        )}
      </Section>

      {/* ── מקור מודעה ── */}
      <Section title="מקור מודעה" icon={Profile2User} badge={counts.listingSource}>
        <div className="flex flex-wrap gap-1.5">
          {LISTING_SOURCE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              count={facets.listingSource[opt.value] ?? 0}
              selected={f.listingSources.includes(opt.value)}
              onClick={() => onChange({ ...f, listingSources: toggleValue(f.listingSources, opt.value) })}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] font-semibold text-secondary-text">
          ללא בחירה: יוצגו גם פרטיות וגם מתיווך
        </p>
      </Section>

      {/* ── מועד כניסה ── */}
      <Section title="מועד כניסה" icon={Calendar1} badge={counts.moveIn}>
        <div className="flex flex-wrap gap-1.5">
          {MOVE_IN_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              icon={Calendar1}
              count={facets.moveIn[opt.value] ?? 0}
              selected={f.moveIn.includes(opt.value)}
              onClick={() => onChange({ ...f, moveIn: toggleValue(f.moveIn, opt.value) })}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] font-semibold text-secondary-text">
          ללא בחירה: כל מועדי הכניסה רלוונטיים · מודעות בלי תאריך כניסה לא ייכללו
        </p>
      </Section>

      {/* ── מאפיינים חשובים ── */}
      <Section title="מאפיינים חשובים" icon={Filter} badge={counts.features}>
        <div className="flex flex-wrap gap-1.5">
          {visibleFeatureChips.map(({ key, label, count }) => (
            <Chip
              key={key}
              label={label}
              count={count}
              selected={f.requiredFeatures.includes(key)}
              onClick={() => onChange({ ...f, requiredFeatures: toggleValue(f.requiredFeatures, key) })}
            />
          ))}
        </div>
        {featureChips.length > visibleFeatureChips.length && (
          <button
            type="button"
            onClick={() => setShowAllFeatures(true)}
            className="mt-2 text-[11.5px] font-bold text-primary"
          >
            הצג עוד {featureChips.length - visibleFeatureChips.length} מאפיינים (ללא תוצאות כרגע)
          </button>
        )}
        {showAllFeatures && (
          <button
            type="button"
            onClick={() => setShowAllFeatures(false)}
            className="mt-2 text-[11.5px] font-bold text-primary"
          >
            הצג רק מאפיינים עם תוצאות
          </button>
        )}
      </Section>

      {/* ── מקומות בסביבה ── */}
      <Section title="מקומות בסביבה שחשובים לי" icon={Location} badge={counts.nearby}>
        <p className="mb-2.5 text-[11.5px] font-semibold text-secondary-text">
          מה שתבחרו יופיע ראשון בעמוד הדירה. משפיע על סדר התוצאות במיון &quot;התאמה חכמה&quot;.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {NEARBY_OPTIONS.map((opt) => (
            <Chip
              key={opt.kind}
              label={opt.label}
              icon={NEARBY_ICONS[opt.kind]}
              selected={f.preferredNearby.includes(opt.kind)}
              // Only a handful of kinds map onto a field the web actually has;
              // the rest are stored for the property page but cannot move the
              // ranking. Say so instead of implying they all do.
              title={nearbyHasSignal(opt.kind) ? undefined : 'נשמר להעדפות — עדיין לא משפיע על הדירוג'}
              onClick={() => onChange({ ...f, preferredNearby: toggleValue(f.preferredNearby, opt.kind) })}
            />
          ))}
        </div>
      </Section>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-app pt-4">
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-border-app bg-cloud px-4 py-2.5 text-[13px] font-bold text-navy transition hover:text-coral"
        >
          נקה הכל
        </button>
        {footer}
      </div>
    </div>
  )
}

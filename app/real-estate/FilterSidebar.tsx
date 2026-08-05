'use client'

// Full filter sidebar — 1:1 port of the app's _FiltersSheet (discover_screen.dart)
// section structure and Hebrew labels, minus מיון (it lives in the page top bar)
// and minus the app's preferred/required double-tap tiers: web chips are a
// single "must-have" toggle, and every change applies instantly.

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
  formatPrice,
  priceBounds,
  propertyPasses,
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
    <section className={first ? 'pt-1' : 'border-t border-border-app pt-5'}>
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
}: {
  label: string
  selected: boolean
  onClick: () => void
  icon?: Icon
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition ${
        selected
          ? 'border-primary bg-primary text-white'
          : 'border-border-app bg-white text-navy hover:border-primary/40'
      }`}
    >
      {IconCmp ? <IconCmp size={14} color={selected ? '#FFFFFF' : '#072946'} /> : null}
      {label}
    </button>
  )
}

export default function FilterSidebar({
  items,
  filters,
  onChange,
  onClear,
}: {
  items: Property[]
  filters: WebFilters
  onChange: (next: WebFilters) => void
  onClear: () => void
}) {
  const f = filters
  const counts = sectionCounts(f)
  const bounds = priceBounds(f.transactionType)
  const [cityQuery, setCityQuery] = useState('')

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
  // (availableFeatures parity). Extra live labels resolve through the alias map,
  // so anything unknown is shown verbatim and matched verbatim.
  const featureChips = useMemo(() => {
    const byKey = new Map<string, string>()
    for (const def of FEATURE_CATALOG) byKey.set(def.key, def.label)
    for (const p of items) {
      const raw: string[] = []
      if (Array.isArray(p.features)) raw.push(...p.features.filter((s): s is string => typeof s === 'string'))
      raw.push(...(p.featureLabels ?? []))
      for (const label of raw) {
        const key = canonicalFeatureKey(label)
        if (!byKey.has(key) && /[֐-׿]/.test(label)) byKey.set(key, label.trim())
      }
    }
    return [...byKey.entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'he'))
  }, [items])

  const citySuggestions = useMemo(() => {
    const q = cityQuery.trim().toLowerCase()
    if (!q) return []
    return availableCities.filter((c) => c.toLowerCase().includes(q)).slice(0, 12)
  }, [availableCities, cityQuery])

  const transactionCount = (t: WebFilters['transactionType']) => {
    const scoped = withTransaction(f, t)
    const now = new Date()
    return items.filter((p) => propertyPasses(p, scoped, now)).length
  }

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
    <div className="flex flex-col gap-5 rounded-3xl border border-border-app bg-white p-4 card-shadow">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-black text-navy">סינון ומיון</h2>
        <button
          type="button"
          onClick={onClear}
          className="text-[12.5px] font-bold text-secondary-text transition hover:text-coral"
        >
          נקה הכל
        </button>
      </div>

      {/* ── מטרה ── */}
      <Section title="מטרה" icon={Filter} badge={counts.transaction} first>
        <div className="grid grid-cols-3 gap-2">
          {TRANSACTION_OPTIONS.map((opt) => {
            const selected = f.transactionType === opt.value
            return (
              <button
                key={opt.value}
                type="button"
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
                  {transactionCount(opt.value)} דירות
                </span>
              </button>
            )
          })}
        </div>
      </Section>

      {/* ── טווח מחירים ── */}
      <Section title="טווח מחירים" icon={Money} badge={counts.price}>
        <DualRange
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
                className={`block w-full px-3 py-2 text-right text-[13px] font-bold transition hover:bg-cloud ${
                  f.city === city ? 'bg-primary-light2 text-primary' : 'text-navy'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_CITIES.map((city) => (
            <Chip key={city} label={city} selected={f.city === city} onClick={() => setCity(city)} />
          ))}
        </div>
      </Section>

      {/* ── טווח גודל ── */}
      <Section title="טווח גודל" icon={Maximize4} badge={counts.size}>
        <DualRange
          min={0}
          max={SIZE_SLIDER_MAX}
          step={10}
          valueMin={f.minSizeM2}
          valueMax={Math.min(f.maxSizeM2, SIZE_SLIDER_MAX)}
          onChange={(minSizeM2, maxSizeM2) => onChange({ ...f, minSizeM2, maxSizeM2 })}
          format={(v) => `${v.toLocaleString('he-IL')} מ״ר`}
          maxLabel="2,000+ מ״ר"
        />
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
          <div className="flex flex-wrap gap-1.5">
            {availableConditions.map((condition) => (
              <Chip
                key={condition}
                label={condition}
                selected={f.conditions.includes(condition)}
                onClick={() => onChange({ ...f, conditions: toggleValue(f.conditions, condition) })}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ── מקור מודעה ── */}
      <Section title="מקור מודעה" icon={Profile2User} badge={counts.listingSource}>
        <div className="flex flex-wrap gap-1.5">
          {LISTING_SOURCE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
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
              selected={f.moveIn.includes(opt.value)}
              onClick={() => onChange({ ...f, moveIn: toggleValue(f.moveIn, opt.value) })}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] font-semibold text-secondary-text">
          ללא בחירה: כל מועדי הכניסה רלוונטיים
        </p>
      </Section>

      {/* ── מאפיינים חשובים ── */}
      <Section title="מאפיינים חשובים" icon={Filter} badge={counts.features}>
        <div className="flex flex-wrap gap-1.5">
          {featureChips.map(({ key, label }) => (
            <Chip
              key={key}
              label={label}
              selected={f.requiredFeatures.includes(key)}
              onClick={() => onChange({ ...f, requiredFeatures: toggleValue(f.requiredFeatures, key) })}
            />
          ))}
        </div>
      </Section>

      {/* ── מקומות בסביבה ── */}
      <Section title="מקומות בסביבה שחשובים לי" icon={Location} badge={counts.nearby}>
        <p className="mb-2.5 text-[11.5px] font-semibold text-secondary-text">
          מה שתבחרו יופיע ראשון בעמוד הדירה וישפיע על הדירוג
        </p>
        <div className="flex flex-wrap gap-1.5">
          {NEARBY_OPTIONS.map((opt) => (
            <Chip
              key={opt.kind}
              label={opt.label}
              icon={NEARBY_ICONS[opt.kind]}
              selected={f.preferredNearby.includes(opt.kind)}
              onClick={() => onChange({ ...f, preferredNearby: toggleValue(f.preferredNearby, opt.kind) })}
            />
          ))}
        </div>
      </Section>

      <button
        type="button"
        onClick={onClear}
        className="rounded-full border border-border-app bg-cloud px-4 py-2.5 text-[13px] font-bold text-navy transition hover:text-coral"
      >
        נקה הכל
      </button>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Add, ArrowLeft2, ArrowRight2, Clock, CloudChange, Danger, Home2, TickCircle, Trash } from 'iconsax-react'
import type { User } from 'firebase/auth'
import type { Property } from '@/lib/live/types'
import { addressLabel } from '@/lib/live/api'
import { useAuthGate } from '@/components/keyz/auth/AuthGate'
import { fetchMyProperties, loadSlots, saveSlots, type ViewingSlot } from './portal-api'

// Visitors may LOOK at the calendar; creating a slot is the meaningful action.
const SLOT_REASON = 'כדי לשמור את מועדי הביקור ולסנכרן אותם עם האפליקציה'

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const DURATIONS = [15, 30, 45, 60]

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfWeek(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  out.setDate(out.getDate() - out.getDay()) // Sunday-start (Israel)
  return out
}

export default function CalendarTab({ user }: { user: User | null }) {
  const [slots, setSlots] = useState<ViewingSlot[]>([])
  const [cloud, setCloud] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [selected, setSelected] = useState(() => toISO(new Date()))
  const [showForm, setShowForm] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])

  const todayISO = toISO(new Date())
  const { requireAuth } = useAuthGate()
  const uid = user?.uid ?? null

  useEffect(() => {
    let alive = true
    ;(async () => {
      // A visitor without an account has no slots and no properties to query —
      // the grid still renders, just empty.
      const [{ slots: loaded, cloud: cloudOk }, props] = await Promise.all([
        uid ? loadSlots() : Promise.resolve({ slots: [] as ViewingSlot[], cloud: true }),
        uid ? fetchMyProperties(uid).catch(() => [] as Property[]) : Promise.resolve([] as Property[]),
      ])
      if (!alive) return
      setSlots(loaded)
      setCloud(cloudOk)
      setProperties(props)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [uid])

  // Optimistic persist — UI updates instantly, cloud badge reflects the result.
  function persist(next: ViewingSlot[]) {
    setSlots(next)
    void saveSlots(next).then(setCloud)
  }

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart)
        d.setDate(d.getDate() + i)
        return d
      }),
    [weekStart],
  )

  const daySlots = slots
    .filter((s) => s.dateISO === selected)
    .sort((a, b) => a.time.localeCompare(b.time))

  const propName = (id?: string) => {
    if (!id) return null
    const p = properties.find((pp) => pp.id === id)
    return p ? `${addressLabel(p)}${p.city ? ', ' + p.city : ''}` : null
  }

  function removeSlot(slot: ViewingSlot) {
    const msg = slot.booked
      ? 'יש ביקור משוריין בחלון הזה. למחוק בכל זאת?'
      : 'למחוק את החלון?'
    if (!window.confirm(msg)) return
    persist(slots.filter((s) => s.id !== slot.id))
  }

  function shiftWeek(delta: number) {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + delta * 7)
    setWeekStart(next)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-[900px] mx-auto w-full py-4 space-y-6">
      {/* Sync badge */}
      <div className="flex items-center justify-between mb-2">
        {!uid ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-secondary-text bg-cloud rounded-full px-3 py-1.5">
            <Danger size={14} variant="Bold" color="currentColor" />
            מתחברים כדי לסנכרן עם האפליקציה
          </span>
        ) : cloud === false ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-secondary-text bg-cloud rounded-full px-3 py-1.5">
            <Danger size={14} variant="Bold" color="currentColor" />
            נשמר מקומית בלבד
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-bold text-success bg-success/10 rounded-full px-3 py-1.5">
            <CloudChange size={14} variant="Bold" color="currentColor" />
            מסונכרן עם האפליקציה
          </span>
        )}
      </div>

      {/* Week strip */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => shiftWeek(-1)}
          className="w-8 h-8 rounded-full text-secondary-text hover:bg-cloud flex items-center justify-center shrink-0"
          title="שבוע קודם"
        >
          <ArrowRight2 size={16} color="currentColor" />
        </button>
        <div className="grid grid-cols-7 gap-1.5 flex-1">
          {days.map((d) => {
            const iso = toISO(d)
            const count = slots.filter((s) => s.dateISO === iso).length
            const isToday = iso === todayISO
            const isSel = iso === selected
            return (
              <button
                key={iso}
                onClick={() => setSelected(iso)}
                className={`rounded-2xl py-2.5 flex flex-col items-center gap-0.5 border transition-colors ${
                  isSel
                    ? 'bg-primary text-white border-primary'
                    : isToday
                      ? 'bg-primary-light2 text-navy border-primary/40'
                      : 'bg-white text-navy border-border-app hover:border-primary/40'
                }`}
              >
                <span className="text-[11px] font-bold opacity-80">{DAY_NAMES[d.getDay()]}</span>
                <span className="font-black">{d.getDate()}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    count ? (isSel ? 'bg-white' : 'bg-primary') : 'bg-transparent'
                  }`}
                />
              </button>
            )
          })}
        </div>
        <button
          onClick={() => shiftWeek(1)}
          className="w-8 h-8 rounded-full text-secondary-text hover:bg-cloud flex items-center justify-center shrink-0"
          title="שבוע הבא"
        >
          <ArrowLeft2 size={16} color="currentColor" />
        </button>
      </div>

      {/* New slot */}
      <div className="mt-5">
        {showForm ? (
          <NewSlotForm
            defaultDate={selected}
            properties={properties}
            onCancel={() => setShowForm(false)}
            onCreate={(created) => {
              persist([...slots, ...created])
              setShowForm(false)
              setSelected(created[0].dateISO)
            }}
          />
        ) : (
          <button
            onClick={() => requireAuth(SLOT_REASON, () => setShowForm(true))}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark transition-colors text-white font-bold rounded-full px-5 py-2.5 text-sm"
          >
            <Add size={18} color="currentColor" />
            חלון חדש
          </button>
        )}
      </div>

      {/* Slot list */}
      <div className="mt-5 flex flex-col gap-3">
        {daySlots.length === 0 && (
          <div className="text-secondary-text text-sm bg-cloud rounded-2xl px-4 py-6 text-center">
            אין חלונות ביקור ביום הזה. הוסיפו חלון חדש כדי ששוכרים יוכלו לקבוע ביקור.
          </div>
        )}
        {daySlots.map((slot) => {
          const prop = propName(slot.propertyId)
          return (
            <div
              key={slot.id}
              className="bg-white border border-border-app rounded-2xl card-shadow px-4 py-3 flex items-center gap-3"
            >
              <span className="w-10 h-10 rounded-xl bg-primary-light2 text-primary flex items-center justify-center shrink-0">
                <Clock size={19} variant="Bold" color="currentColor" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-black text-navy">
                  {slot.time}
                  <span className="text-secondary-text font-bold text-sm"> · {slot.durationMin} דק׳</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-secondary-text mt-0.5">
                  {prop && (
                    <span className="flex items-center gap-1">
                      <Home2 size={13} color="currentColor" />
                      {prop}
                    </span>
                  )}
                  {slot.tag && (
                    <span className="bg-cloud rounded-full px-2 py-0.5 font-bold">{slot.tag}</span>
                  )}
                  {slot.note && <span className="truncate">{slot.note}</span>}
                </div>
              </div>
              {slot.booked && (
                <span className="flex items-center gap-1 text-success text-xs font-bold shrink-0">
                  <TickCircle size={15} variant="Bold" color="currentColor" />
                  משוריין
                </span>
              )}
              <button
                onClick={() => removeSlot(slot)}
                className="w-9 h-9 rounded-full text-secondary-text hover:text-coral hover:bg-coral/10 flex items-center justify-center shrink-0 transition-colors"
                title="מחיקה"
              >
                <Trash size={17} color="currentColor" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── New slot form ─────────────────────────────────────────────────────────────

function NewSlotForm({
  defaultDate,
  properties,
  onCreate,
  onCancel,
}: {
  defaultDate: string
  properties: Property[]
  onCreate: (slots: ViewingSlot[]) => void
  onCancel: () => void
}) {
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('17:00')
  const [duration, setDuration] = useState(30)
  const [propertyId, setPropertyId] = useState('')
  const [note, setNote] = useState('')
  const [tag, setTag] = useState('')
  const [repeatWeeks, setRepeatWeeks] = useState(1) // 1 = no repeat, N ≤ 8

  function create() {
    if (!date || !time) return
    const out: ViewingSlot[] = []
    for (let w = 0; w < Math.min(repeatWeeks, 8); w++) {
      const d = new Date(`${date}T00:00:00`)
      d.setDate(d.getDate() + w * 7)
      out.push({
        id: `slot-${Date.now()}-${w}`,
        dateISO: toISO(d),
        time,
        durationMin: duration,
        ...(propertyId ? { propertyId } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(tag.trim() ? { tag: tag.trim() } : {}),
        booked: false,
      })
    }
    onCreate(out)
  }

  const inputCls =
    'border border-border-app rounded-xl px-3 py-2 text-sm text-navy bg-white outline-none focus:border-primary min-w-0'

  return (
    <div className="bg-white border border-primary/30 rounded-[28px] card-shadow p-5">
      <div className="font-black text-navy mb-4">חלון ביקור חדש</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-xs font-bold text-secondary-text">
          תאריך
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-secondary-text">
          שעה
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-secondary-text">
          משך
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inputCls}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} דקות
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-secondary-text">
          נכס (אופציונלי)
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={inputCls}>
            <option value="">— ללא —</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {addressLabel(p)}
                {p.city ? `, ${p.city}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-secondary-text">
          תגית
          <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="למשל: סיור קבוצתי" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-secondary-text">
          חזרה
          <select value={repeatWeeks} onChange={(e) => setRepeatWeeks(Number(e.target.value))} className={inputCls}>
            <option value={1}>ללא חזרה</option>
            <option value={4}>כל שבוע (4 שבועות)</option>
            <option value={8}>כל שבוע (8 שבועות)</option>
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-bold text-secondary-text mt-3">
        הערה
        <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
      </label>
      <div className="flex gap-2 mt-4">
        <button
          onClick={create}
          className="flex-1 bg-primary hover:bg-primary-dark transition-colors text-white font-bold rounded-full py-2.5 text-sm"
        >
          הוספת חלון
        </button>
        <button
          onClick={onCancel}
          className="px-5 rounded-full border border-border-app text-secondary-text font-bold text-sm hover:bg-cloud transition-colors"
        >
          ביטול
        </button>
      </div>
    </div>
  )
}

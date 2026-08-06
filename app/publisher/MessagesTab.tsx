'use client'

// "הודעות ופניות" — the landlord's inbox: tenants who liked a listing and are
// waiting for a yes/no (candidates, ranked by the same two-sided scorer the
// app uses), and threads that are already a mutual match. Approving a
// candidate creates the SAME match row the app's swipe-right does
// (match-<propertyId>~<tenantUid>), so the tenant sees it in their app too.
// Rejecting is local-only, exactly like the app's left-swipe — the like stays
// on record, it's just hidden here.

import { useEffect, useState } from 'react'
import { CloseCircle, Messages3, Send2, TickCircle, User } from 'iconsax-react'
import type { User as FbUser } from 'firebase/auth'
import { useAuthGate } from '@/components/keyz/auth/AuthGate'
import { addressLabel, cityLabel, fetchPropertyById } from '@/lib/live/api'
import {
  approveLead,
  dismissLead,
  fetchLeads,
  fetchMatches,
  fetchThread,
  isDismissed,
  sendThreadMessage,
  type ChatMsg,
  type Lead,
  type MatchRow,
} from './messages-api'

const ROLE_BADGE: Record<MatchRow['role'], { text: string; cls: string }> = {
  landlord: { text: 'כבעל/ת דירה', cls: 'bg-primary-light2 text-primary' },
  tenant: { text: 'כמחפש/ת דירה', cls: 'bg-violet-50 text-violet-600' },
}

const MESSAGES_REASON = 'כדי לראות פניות ולנהל שיחות עם מתעניינים'

export default function MessagesTab({ user }: { user: FbUser | null }) {
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [matches, setMatches] = useState<MatchRow[] | null>(null)
  const [error, setError] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [openThread, setOpenThread] = useState<string | null>(null)
  const { requireAuth } = useAuthGate()
  const uid = user?.uid ?? null

  useEffect(() => {
    if (!uid) {
      setLeads([])
      setMatches([])
      return
    }
    let alive = true
    Promise.all([fetchLeads(), fetchMatches(uid)])
      .then(([l, m]) => {
        if (!alive) return
        setLeads(l)
        setMatches(m)
      })
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [uid])

  const matchedPairs = new Set(
    (matches ?? []).filter((m) => m.role === 'landlord').map((m) => `${m.propertyId}~${m.tenantUid}`),
  )
  const visibleLeads = (leads ?? []).filter(
    (l) => !matchedPairs.has(`${l.propertyId}~${l.tenantId}`) && !isDismissed(l.propertyId, l.tenantId),
  )

  async function handleApprove(lead: Lead) {
    const key = `${lead.propertyId}~${lead.tenantId}`
    setBusyKey(key)
    try {
      await approveLead(lead.propertyId, lead.tenantId)
      setMatches((prev) => [
        ...(prev ?? []),
        {
          id: `match-${lead.propertyId}~${lead.tenantId}`,
          propertyId: lead.propertyId,
          tenantUid: lead.tenantId,
          role: 'landlord',
        },
      ])
    } catch {
      /* leave it in the candidates list so the landlord can retry */
    } finally {
      setBusyKey(null)
    }
  }

  function handleReject(lead: Lead) {
    dismissLead(lead.propertyId, lead.tenantId)
    setLeads((prev) => (prev ? [...prev] : prev)) // force a re-filter render
  }

  if (!uid) {
    return (
      <div className="text-center bg-cloud rounded-[28px] px-6 py-12 max-w-[500px] mx-auto">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-primary-light2 text-primary items-center justify-center">
          <Messages3 size={26} variant="Bold" color="currentColor" />
        </span>
        <div className="font-black text-navy mt-4">הפניות שלך יופיעו כאן</div>
        <p className="text-secondary-text text-sm mt-1.5 leading-relaxed">
          מתחברים עם אותו חשבון כמו באפליקציה — כל מי שהתעניין בדירות שלך, ואפשר לאשר או לדחות ישירות מכאן.
        </p>
        <button
          onClick={() => requireAuth(MESSAGES_REASON, () => {})}
          className="mt-5 inline-flex items-center justify-center gap-2 bg-white border border-border-app hover:border-primary/40 transition-colors rounded-full px-5 py-2.5 font-bold text-navy text-sm"
        >
          <span className="w-5 h-5 rounded-full bg-cloud border border-border-app flex items-center justify-center text-[10px] font-black text-primary">
            G
          </span>
          התחברות עם Google
        </button>
      </div>
    )
  }

  if (leads === null || matches === null) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-secondary-text bg-cloud rounded-2xl px-4 py-10 max-w-[500px] mx-auto">
        לא הצלחנו לטעון את הפניות כרגע. נסו לרענן את העמוד.
      </div>
    )
  }

  return (
    <div className="max-w-[760px] mx-auto w-full py-4 space-y-8">
      <section>
        <h2 className="mb-3 text-[15px] font-black text-navy">
          פניות חדשות
          {visibleLeads.length > 0 && (
            <span className="mr-2 rounded-full bg-primary-light2 px-2.5 py-0.5 text-[12px] font-bold text-primary">
              {visibleLeads.length}
            </span>
          )}
        </h2>
        {visibleLeads.length === 0 ? (
          <div className="rounded-2xl bg-cloud px-4 py-6 text-center text-[13px] font-semibold text-secondary-text">
            אין כרגע פניות חדשות ממתינות לתשובה.
          </div>
        ) : (
          <div className="space-y-2.5">
            {visibleLeads.map((lead) => {
              const key = `${lead.propertyId}~${lead.tenantId}`
              const busy = busyKey === key
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-2xl border border-border-app bg-white p-3.5 card-shadow"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light2 text-primary">
                    <User size={20} variant="Bold" color="currentColor" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-black text-navy">{lead.tenantName}</p>
                    <p className="truncate text-[12px] font-semibold text-secondary-text">
                      מתעניין/ת ב{lead.propertyTitle || 'אחת הדירות שלך'}
                      {lead.excluded && <span className="text-coral"> · לא עומד/ת בדרישות שהגדרת</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleReject(lead)}
                    aria-label="דחייה"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-app text-secondary-text transition hover:border-coral hover:text-coral disabled:opacity-50"
                  >
                    <CloseCircle size={18} color="currentColor" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => requireAuth(MESSAGES_REASON, () => void handleApprove(lead))}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12.5px] font-bold text-white transition hover:bg-primary-dark disabled:opacity-60"
                  >
                    <TickCircle size={16} color="currentColor" />
                    {busy ? 'מאשרים…' : 'אישור'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-black text-navy">שיחות פעילות</h2>
        {matches.length === 0 ? (
          <div className="rounded-2xl bg-cloud px-4 py-6 text-center text-[13px] font-semibold text-secondary-text">
            ברגע שתאשרו פנייה, השיחה תיפתח כאן.
          </div>
        ) : (
          <div className="space-y-2.5">
            {matches.map((m) => (
              <MatchThread
                key={m.id}
                match={m}
                uid={uid}
                open={openThread === m.id}
                onToggle={() => setOpenThread((cur) => (cur === m.id ? null : m.id))}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MatchTitle({ propertyId }: { propertyId: string }) {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchPropertyById(propertyId).then(({ item }) => {
      if (!alive || !item) return
      const addr = addressLabel(item)
      const city = cityLabel(item)
      setLabel(city && addr !== city ? `${addr} · ${city}` : addr)
    })
    return () => {
      alive = false
    }
  }, [propertyId])

  return <>{label ?? 'שיחה על דירה'}</>
}

function MatchThread({
  match,
  uid,
  open,
  onToggle,
}: {
  match: MatchRow
  uid: string
  open: boolean
  onToggle: () => void
}) {
  const [messages, setMessages] = useState<ChatMsg[] | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return
    let alive = true
    fetchThread(match.id).then((m) => alive && setMessages(m))
    return () => {
      alive = false
    }
  }, [open, match.id])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    try {
      await sendThreadMessage(match.id, text)
      const fresh = await fetchThread(match.id)
      setMessages(fresh)
    } catch {
      /* the input already cleared — a retry is just typing it again */
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border-app bg-white card-shadow">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-3.5 text-start"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light2 text-primary">
          <User size={20} variant="Bold" color="currentColor" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-black text-navy">
            <MatchTitle propertyId={match.propertyId} />
          </p>
          <p className="truncate text-[12px] font-semibold text-secondary-text">לחיצה לפתיחת השיחה</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${ROLE_BADGE[match.role].cls}`}>
          {ROLE_BADGE[match.role].text}
        </span>
      </button>

      {open && (
        <div className="border-t border-border-app p-3.5">
          <div className="no-scrollbar mb-3 max-h-64 space-y-2 overflow-y-auto">
            {messages === null ? (
              <div className="flex justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : messages.length === 0 ? (
              <p className="py-3 text-center text-[12.5px] font-semibold text-secondary-text">
                עוד אין הודעות בשיחה הזו.
              </p>
            ) : (
              messages.map((m, i) => (
                <div key={m.id ?? i} className="flex flex-col">
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] font-medium leading-relaxed ${
                      m.senderId === uid
                        ? 'self-end rounded-br-sm bg-primary text-white'
                        : 'self-start rounded-bl-sm bg-cloud text-navy'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="הקלידו הודעה…"
              className="min-w-0 flex-1 rounded-full border border-border-app px-4 py-2 text-[13px] outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              aria-label="שליחה"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-dark disabled:opacity-60"
            >
              <Send2 size={16} color="currentColor" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

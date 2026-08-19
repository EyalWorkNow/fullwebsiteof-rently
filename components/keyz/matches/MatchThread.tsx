'use client'

// Shared match-thread card: a collapsed row (property title + "tap to open")
// that expands into the message history + a send box. Used by both the
// landlord inbox (app/publisher/MessagesTab.tsx) and the tenant conversations
// page (app/messages/) — same matchId scheme, same /messages REST contract,
// so the rendering can be identical regardless of which side of the match
// the current account is on.

import { useEffect, useRef, useState } from 'react'
import { Send2, User } from 'iconsax-react'
import { addressLabel, cityLabel, fetchPropertyById } from '@/lib/live/api'
import { fetchThread, sendThreadMessage, type ChatMsg } from '@/lib/live/messages-api'
import {
  encodeSlotConfirm,
  formatSlot,
  formatVoiceDuration,
  parseMedia,
  parseSlots,
} from '@/lib/live/chat-markers'

// One bubble's content: renders the app's in-text markers (images, voice
// notes, viewing-slot proposals/confirmations) instead of the raw
// `[[MEDIA:…]]` / `[[SLOTS:…]]` strings the app encodes into `text`.
function MsgBody({
  msg,
  mine,
  onConfirmSlot,
}: {
  msg: ChatMsg
  mine: boolean
  onConfirmSlot: (text: string) => void
}) {
  const media = parseMedia(msg.text)
  if (media?.kind === 'image') {
    return (
      <a href={media.url} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media.url} alt="תמונה מהשיחה" loading="lazy" className="max-h-48 rounded-xl" />
      </a>
    )
  }
  if (media?.kind === 'audio') {
    return (
      <span className="flex flex-col gap-1">
        <span className="text-[12px] font-semibold">{formatVoiceDuration(media.durationMs)}</span>
        <audio controls preload="none" src={media.url} className="h-9 max-w-full" />
      </span>
    )
  }
  const slots = parseSlots(msg.text)
  if (slots) {
    return (
      <span className="flex flex-col gap-1.5">
        <span>{slots.human || (slots.kind === 'proposal' ? 'הצעתי מועד לצפייה בדירה 🗓️' : 'אישרתי מועד לצפייה בדירה ✓')}</span>
        {slots.options.map((o) => {
          // A proposal from the OTHER side is actionable — clicking a slot
          // sends the app's exact SLOT_CONFIRM message.
          const clickable = slots.kind === 'proposal' && !mine
          const cls = `rounded-lg px-2.5 py-1.5 text-[12px] font-bold ${
            mine ? 'bg-white/15' : 'bg-white'
          } ${clickable ? 'cursor-pointer hover:ring-2 hover:ring-primary' : ''}`
          return clickable ? (
            <button
              key={o.slotId || o.start}
              type="button"
              onClick={() => onConfirmSlot(encodeSlotConfirm(o, slots.propertyId))}
              className={`${cls} text-start`}
            >
              {formatSlot(o)} — לחיצה לאישור
            </button>
          ) : (
            <span key={o.slotId || o.start} className={cls}>
              {formatSlot(o)}
            </span>
          )
        })}
      </span>
    )
  }
  return <>{msg.text}</>
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

export function MatchThread({
  match,
  uid,
  open,
  onToggle,
}: {
  match: { id: string; propertyId: string }
  uid: string
  open: boolean
  onToggle: () => void
}) {
  const [messages, setMessages] = useState<ChatMsg[] | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(false)
  // Poll and post-send both call fetchThread — without this, a poll response
  // that started before a send can resolve AFTER the send's own refresh and
  // overwrite it with stale (pre-send) messages. Only the most recently
  // ISSUED fetch's response is ever applied, regardless of resolve order.
  const fetchSeqRef = useRef(0)

  useEffect(() => {
    if (!open) return
    let alive = true
    const load = () => {
      const seq = ++fetchSeqRef.current
      fetchThread(match.id).then((m) => {
        if (alive && seq === fetchSeqRef.current) setMessages(m)
      })
    }
    load()
    // Plain REST, no push — poll while the thread is open so a reply from
    // the other side shows up without the visitor closing and reopening it.
    // Skipped while the tab is backgrounded — a chat left open in an inactive
    // tab used to keep polling indefinitely, burning rate-limit budget (and
    // battery) for a screen nobody's looking at.
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, 5000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [open, match.id])

  // Slot confirmations post a pre-encoded message (not the input box's text).
  async function sendRaw(text: string) {
    if (sending) return
    setSending(true)
    setSendError(false)
    try {
      await sendThreadMessage(match.id, text)
      const seq = ++fetchSeqRef.current
      const fresh = await fetchThread(match.id)
      if (seq === fetchSeqRef.current) setMessages(fresh)
    } catch {
      setSendError(true)
    } finally {
      setSending(false)
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setSendError(false)
    setInput('')
    try {
      await sendThreadMessage(match.id, text)
      const seq = ++fetchSeqRef.current
      const fresh = await fetchThread(match.id)
      if (seq === fetchSeqRef.current) setMessages(fresh)
    } catch {
      // Only hand the text back if the box is still empty — the visitor may
      // have already started typing something new during the failed request.
      setInput((current) => (current === '' ? text : current))
      setSendError(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border-app bg-white card-shadow">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-3.5 text-start">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light2 text-primary">
          <User size={20} variant="Bold" color="currentColor" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-black text-navy">
            <MatchTitle propertyId={match.propertyId} />
          </p>
          <p className="truncate text-[12px] font-semibold text-secondary-text">לחיצה לפתיחת השיחה</p>
        </div>
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
                    <MsgBody msg={m} mine={m.senderId === uid} onConfirmSlot={(t) => void sendRaw(t)} />
                  </div>
                </div>
              ))
            )}
          </div>
          {sendError && (
            <p className="mb-2 text-[12px] font-bold text-coral">השליחה נכשלה — נסו שוב</p>
          )}
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
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-dark disabled:opacity-60"
            >
              <Send2 size={16} color="currentColor" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

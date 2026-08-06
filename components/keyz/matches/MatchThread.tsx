'use client'

// Shared match-thread card: a collapsed row (property title + "tap to open")
// that expands into the message history + a send box. Used by both the
// landlord inbox (app/publisher/MessagesTab.tsx) and the tenant conversations
// page (app/messages/) — same matchId scheme, same /messages REST contract,
// so the rendering can be identical regardless of which side of the match
// the current account is on.

import { useEffect, useState } from 'react'
import { Send2, User } from 'iconsax-react'
import { addressLabel, cityLabel, fetchPropertyById } from '@/lib/live/api'
import { fetchThread, sendThreadMessage, type ChatMsg } from '@/lib/live/messages-api'

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

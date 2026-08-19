'use client'

// "השיחות שלי" — the tenant/searcher side of the same match-and-chat system
// the landlord inbox uses (app/publisher/MessagesTab.tsx), but a completely
// separate page: a match here is a property the account liked and a
// landlord approved, not a property it owns. Deliberately its own route
// (not a tab inside /publisher) since a single account can be both a
// landlord and a tenant, and those are two unrelated conversation lists.

import { useEffect, useState } from 'react'
import { Messages3 } from 'iconsax-react'
import { useAuthGate } from '@/components/keyz/auth/AuthGate'
import { MatchThread } from '@/components/keyz/matches/MatchThread'
import { fetchMatches, type MatchRow } from '@/lib/live/messages-api'

const REASON = 'כדי לראות את השיחות שלך עם בעלי הדירות'

export default function TenantMessages() {
  const { user, requireAuth } = useAuthGate()
  const uid = user?.uid ?? null
  const [matches, setMatches] = useState<MatchRow[] | null>(null)
  const [error, setError] = useState(false)
  const [openThread, setOpenThread] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) {
      setMatches([])
      return
    }
    let alive = true
    fetchMatches(uid, 'tenant')
      .then((m) => alive && setMatches(m))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [uid])

  if (!uid) {
    return (
      <div className="text-center bg-cloud rounded-[28px] px-6 py-12 max-w-[500px] mx-auto">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-primary-light2 text-primary items-center justify-center">
          <Messages3 size={26} variant="Bold" color="currentColor" />
        </span>
        <div className="font-black text-navy mt-4">השיחות שלך יופיעו כאן</div>
        <p className="text-secondary-text text-sm mt-1.5 leading-relaxed">
          מתחברים עם אותו חשבון כמו באפליקציה — כל שיחה עם בעל דירה שאישר לך פנייה תופיע כאן.
        </p>
        <button
          onClick={() => requireAuth(REASON, () => {})}
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

  if (error) {
    return (
      <div className="text-center text-secondary-text bg-cloud rounded-2xl px-4 py-10 max-w-[500px] mx-auto">
        לא הצלחנו לטעון את השיחות כרגע. נסו לרענן את העמוד.
      </div>
    )
  }

  if (matches === null) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-[760px] mx-auto w-full">
      {matches.length === 0 ? (
        <div className="rounded-2xl bg-cloud px-4 py-6 text-center text-[13px] font-semibold text-secondary-text">
          עוד אין שיחות פעילות. ברגע שבעל דירה יאשר פנייה שלך, השיחה תיפתח כאן.
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
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Calendar, Home2, Logout, MessageText1 } from 'iconsax-react'
import type { User } from 'firebase/auth'
import { onUser, signInWithGoogle, signOut } from '@/lib/live/firebase'
import ErikTab from './ErikTab'
import CalendarTab from './CalendarTab'
import PropertiesTab from './PropertiesTab'

type TabId = 'erik' | 'calendar' | 'properties'

const TABS: { id: TabId; label: string; Icon: typeof Calendar }[] = [
  { id: 'erik', label: 'אריק — הוספת דירה', Icon: MessageText1 },
  { id: 'calendar', label: 'היומן שלי', Icon: Calendar },
  { id: 'properties', label: 'הנכסים שלי', Icon: Home2 },
]

export default function LandlordPortal() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [signInError, setSignInError] = useState(false)
  const [tab, setTab] = useState<TabId>('erik')

  useEffect(() => {
    const off = onUser((u) => {
      setUser(u)
      setReady(true)
    })
    return off
  }, [])

  // The site signs visitors in anonymously for listing fetches — that is NOT a
  // landlord login. Only a real (Google) account matches the app's uid.
  const signedIn = !!user && !user.isAnonymous

  async function handleGoogle() {
    setSigningIn(true)
    setSignInError(false)
    const u = await signInWithGoogle()
    setSigningIn(false)
    if (!u) setSignInError(true)
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="w-8 h-8 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  // The portal itself is OPEN to visitors — they can look around, read אריק's
  // opening message and see the calendar. Registration is asked for only when
  // they try to complete an action (send a message, publish, save a slot).
  return (
    <div className="max-w-[1100px] mx-auto px-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 py-5">
        {signedIn ? (
          <>
            <div className="flex items-center gap-3 min-w-0">
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-10 h-10 rounded-full border border-border-app object-cover"
                />
              ) : (
                <span className="w-10 h-10 rounded-full bg-primary-light2 text-primary font-black flex items-center justify-center">
                  {(user?.displayName ?? 'ב')[0]}
                </span>
              )}
              <div className="min-w-0">
                <div className="font-bold text-navy truncate">
                  {user?.displayName ?? 'בעל הדירה'}
                </div>
                <div className="text-secondary-text text-xs truncate">{user?.email ?? ''}</div>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 text-secondary-text hover:text-coral transition-colors text-sm font-bold shrink-0"
            >
              <Logout size={18} variant="Linear" color="currentColor" />
              התנתקות
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <Image
                src="/brand/app_icon.png"
                alt="Rently"
                width={40}
                height={40}
                className="rounded-xl shrink-0"
              />
              <div className="min-w-0">
                <div className="font-bold text-navy truncate">אזור בעל הדירה</div>
                <div className="text-secondary-text text-xs truncate">
                  מסתכלים חופשי — מתחברים כשרוצים לפרסם
                </div>
              </div>
            </div>
            <div className="shrink-0 text-end">
              <button
                onClick={handleGoogle}
                disabled={signingIn}
                className="flex items-center gap-2 bg-white border border-border-app hover:border-primary/40 transition-colors rounded-full px-4 py-2 text-sm font-bold text-navy disabled:opacity-60"
              >
                <span className="w-5 h-5 rounded-full bg-cloud border border-border-app flex items-center justify-center text-[10px] font-black text-primary">
                  G
                </span>
                {signingIn ? 'מתחברים…' : 'התחברות עם Google'}
              </button>
              {signInError && <p className="text-coral text-xs mt-1.5">ההתחברות לא הצליחה.</p>}
            </div>
          </>
        )}
      </div>

      {/* Tab pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold whitespace-nowrap transition-colors ${
              tab === id
                ? 'bg-primary text-white'
                : 'bg-cloud text-navy hover:bg-primary-light2'
            }`}
          >
            <Icon size={17} variant={tab === id ? 'Bold' : 'Linear'} color="currentColor" />
            {label}
          </button>
        ))}
      </div>

      <div className="py-6">
        {tab === 'erik' && <ErikTab />}
        {tab === 'calendar' && <CalendarTab user={signedIn ? user : null} />}
        {tab === 'properties' && <PropertiesTab user={signedIn ? user : null} />}
      </div>
    </div>
  )
}

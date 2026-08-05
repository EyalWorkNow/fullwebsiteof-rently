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

  if (!signedIn) {
    return (
      <div className="flex items-center justify-center px-4 py-16 min-h-[60vh]">
        <div className="w-full max-w-[420px] bg-white border border-border-app rounded-[28px] card-shadow p-8 text-center">
          <Image
            src="/brand/app_icon.png"
            alt="Rently"
            width={64}
            height={64}
            className="mx-auto rounded-2xl"
          />
          <h1 className="text-2xl font-black text-navy mt-5">אזור בעל הדירה</h1>
          <p className="text-secondary-text text-sm mt-2 leading-relaxed">
            מפרסמים דירה עם אריק, מנהלים יומן ביקורים ורואים את הנכסים — הכול מהדפדפן.
          </p>
          <button
            onClick={handleGoogle}
            disabled={signingIn}
            className="mt-7 w-full flex items-center justify-center gap-3 bg-white border border-border-app hover:border-primary/40 transition-colors rounded-full px-5 py-3 font-bold text-navy disabled:opacity-60"
          >
            <span className="w-6 h-6 rounded-full bg-cloud border border-border-app flex items-center justify-center text-xs font-black text-primary">
              G
            </span>
            {signingIn ? 'מתחברים…' : 'התחברות עם Google'}
          </button>
          {signInError && (
            <p className="text-coral text-sm mt-3">ההתחברות לא הצליחה. נסו שוב.</p>
          )}
          <p className="text-secondary-text text-xs mt-5">
            מתחברים עם אותו חשבון כמו באפליקציה — הכול מסונכרן
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1100px] mx-auto px-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 py-5">
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
            <div className="font-bold text-navy truncate">{user?.displayName ?? 'בעל הדירה'}</div>
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
        {tab === 'erik' && <ErikTab user={user!} />}
        {tab === 'calendar' && <CalendarTab user={user!} />}
        {tab === 'properties' && <PropertiesTab user={user!} />}
      </div>
    </div>
  )
}

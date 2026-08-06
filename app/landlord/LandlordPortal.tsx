'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  Add,
  Calendar,
  HambergerMenu,
  Home2,
  Logout,
  MessageText1,
  ProfileCircle,
  SearchNormal1,
  User,
  TickCircle,
} from 'iconsax-react'
import type { User as FbUser } from 'firebase/auth'
import { onUser, signInWithGoogle, signOut } from '@/lib/live/firebase'
import { useAuthGate } from '@/components/keyz/auth/AuthGate'
import ErikTab from './ErikTab'
import CalendarTab from './CalendarTab'
import PropertiesTab from './PropertiesTab'

type TabId = 'erik' | 'calendar' | 'properties'

const TABS: { id: TabId; label: string; Icon: typeof Calendar; desc: string }[] = [
  { id: 'erik', label: 'אריק — הוספת דירה', Icon: MessageText1, desc: 'שיחה אינטראקטיבית ליצירת מודעה ב-2 דקות' },
  { id: 'calendar', label: 'היומן שלי', Icon: Calendar, desc: 'ניהול ביקורים וסיורים בדירה' },
  { id: 'properties', label: 'הנכסים שלי', Icon: Home2, desc: 'מעקב וניהול כל המודעות שפורסמו' },
]

export default function LandlordPortal() {
  const [user, setUser] = useState<FbUser | null>(null)
  const [ready, setReady] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [signInError, setSignInError] = useState(false)
  const [tab, setTab] = useState<TabId>('erik')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { isRegistered, requireAuth } = useAuthGate()

  useEffect(() => {
    const off = onUser((u) => {
      setUser(u)
      setReady(true)
    })
    return off
  }, [])

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
      <div className="flex flex-1 items-center justify-center py-40">
        <div className="w-10 h-10 rounded-full border-[3px] border-[#0061FF] border-t-transparent animate-spin" />
      </div>
    )
  }

  const activeTabInfo = TABS.find((t) => t.id === tab) ?? TABS[0]

  return (
    <div className="flex h-full w-full gap-4 p-3 md:p-4 overflow-hidden relative">
      {/* ── Floating Collapsible Sidebar (Right) 1:1 like AtiWorkspace ────────── */}
      <aside
        className={`relative flex h-full flex-col bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-lg transition-all duration-300 overflow-hidden shrink-0 ${
          isSidebarCollapsed ? 'w-[72px]' : 'w-[270px]'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-100">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0061FF] to-[#38B6FF] text-white shadow-md shrink-0">
                <Home2 size={20} variant="Bold" color="currentColor" />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-[15px] font-black text-slate-900 leading-tight">
                  Rently
                </span>
                <span className="block truncate text-[11px] font-bold text-[#0061FF]">
                  אזור בעל הדירה
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0061FF] to-[#38B6FF] text-white shadow-md shrink-0">
              <Home2 size={20} variant="Bold" color="currentColor" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            aria-label={isSidebarCollapsed ? 'הרחב סרגל צד' : 'כווץ סרגל צד'}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-[#0061FF] transition shrink-0"
          >
            <HambergerMenu size={16} color="currentColor" />
          </button>
        </div>

        {/* Primary Action Button */}
        <div className="p-3">
          {!isSidebarCollapsed ? (
            <button
              type="button"
              onClick={() => setTab('erik')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0061FF] px-4 py-2.5 text-[13.5px] font-bold text-white shadow-md transition hover:bg-blue-700"
            >
              <Add size={18} color="currentColor" />
              <span>הוספת דירה ב-2 דקות</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setTab('erik')}
              title="הוספת דירה"
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0061FF] text-white shadow-md transition hover:bg-blue-700"
            >
              <Add size={20} color="currentColor" />
            </button>
          )}
        </div>

        {/* Search input in sidebar */}
        {!isSidebarCollapsed && (
          <div className="px-3 pb-2">
            <div className="relative flex items-center rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-1.5 focus-within:border-[#0061FF] focus-within:bg-white transition">
              <SearchNormal1 size={15} color="currentColor" className="text-slate-400 shrink-0 me-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חפש בנכסים וביומן..."
                className="w-full bg-transparent text-[12.5px] text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-2 py-2 flex-1 overflow-y-auto no-scrollbar">
          <nav className="flex flex-col gap-1">
            {TABS.map(({ id, label, Icon }) => {
              const active = tab === id
              return !isSidebarCollapsed ? (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-[13px] font-bold transition w-full text-start ${
                    active
                      ? 'bg-blue-50/80 text-[#0061FF] shadow-sm border border-blue-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={18} color="currentColor" variant={active ? 'Bold' : 'Linear'} />
                  <span className="truncate">{label}</span>
                </button>
              ) : (
                <button
                  key={id}
                  type="button"
                  title={label}
                  onClick={() => setTab(id)}
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl transition mx-auto ${
                    active ? 'bg-blue-50 text-[#0061FF]' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={20} color="currentColor" variant={active ? 'Bold' : 'Linear'} />
                </button>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
          {!isSidebarCollapsed ? (
            signedIn ? (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {user?.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt=""
                      className="w-8 h-8 rounded-full border border-blue-200 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0061FF] font-bold flex items-center justify-center shrink-0 text-xs">
                      {(user?.displayName ?? 'ב')[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-bold text-slate-900">
                      {user?.displayName || 'בעל דירה'}
                    </span>
                    <span className="block truncate text-[10px] font-semibold text-slate-400">
                      {user?.email}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => signOut()}
                  title="התנתקות"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                >
                  <Logout size={16} color="currentColor" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogle}
                disabled={signingIn}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-blue-50 hover:text-[#0061FF]"
              >
                <User size={16} color="#0061FF" variant="Bold" />
                <span>{signingIn ? 'מתחברים…' : 'התחברות בעל דירה'}</span>
              </button>
            )
          ) : (
            <div className="flex justify-center">
              {signedIn ? (
                <button
                  type="button"
                  onClick={() => signOut()}
                  title="התנתקות"
                  className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                >
                  <Logout size={18} color="currentColor" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogle}
                  title="התחברות"
                  className="h-9 w-9 flex items-center justify-center rounded-xl bg-blue-50 text-[#0061FF]"
                >
                  <User size={18} color="currentColor" variant="Bold" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Workspace Container (Left) 1:1 like AtiWorkspace ───────────── */}
      <main className="flex-1 flex flex-col bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-lg overflow-hidden min-w-0">
        {/* Workspace Top Header Bar */}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#0061FF] font-bold shadow-sm">
              <activeTabInfo.Icon size={22} variant="Bold" color="currentColor" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 leading-tight">
                {activeTabInfo.label}
              </h1>
              <p className="text-xs font-semibold text-slate-400">
                {activeTabInfo.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {signedIn ? (
              <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                <TickCircle size={14} color="#059669" variant="Bold" />
                <span>בעל דירה מחובר</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogle}
                disabled={signingIn}
                className="hidden sm:flex items-center gap-2 bg-[#0061FF] text-white rounded-full px-4 py-1.5 text-xs font-bold shadow-md hover:bg-blue-700 transition"
              >
                <span>{signingIn ? 'מתחברים…' : 'התחברות בעל דירה'}</span>
              </button>
            )}
          </div>
        </header>

        {/* Workspace Tab View Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col bg-[#F8FAFC]/50">
          {tab === 'erik' && <ErikTab />}
          {tab === 'calendar' && <CalendarTab user={user} />}
          {tab === 'properties' && <PropertiesTab user={user} />}
        </div>
      </main>
    </div>
  )
}

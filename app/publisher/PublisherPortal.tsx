'use client'

// The unified publisher area — replaces the old /landlord portal. Same
// floating sidebar + workspace shell, now with 5 tabs: overview (listing
// health), עזרא (the assistant), properties, audience (aggregate cohort
// breakdown), calendar. No hard sign-in wall — a visitor can see the shell
// and every tab; tabs that need a uid (properties/audience/calendar) show
// their own inviting empty state and the action-triggered auth gate fires
// on the first real action (already how EzraWorkspace/CalendarTab/
// PropertiesTab are built).

import { useEffect, useState } from 'react'
import {
  Add,
  Calendar,
  Chart21,
  HambergerMenu,
  Home2,
  Logout,
  MessageText1,
  ProfileCircle,
  SearchNormal1,
  User,
  UserOctagon,
} from 'iconsax-react'
import type { User as FbUser } from 'firebase/auth'
import { onUser, signInWithGoogle, signOut } from '@/lib/live/firebase'
import EzraWorkspace from './ezra/EzraWorkspace'
import CalendarTab from './CalendarTab'
import PropertiesTab from './PropertiesTab'
import OverviewTab from './OverviewTab'
import AudienceTab from './AudienceTab'

type TabId = 'overview' | 'ezra' | 'properties' | 'audience' | 'calendar'

const TABS: { id: TabId; label: string; Icon: typeof Calendar; desc: string }[] = [
  { id: 'overview', label: 'סקירה', Icon: Chart21, desc: 'איך הדירות שלכם מתפקדות מול האזור' },
  { id: 'ezra', label: 'עזרא — הוספת דירה', Icon: MessageText1, desc: 'שיחה אינטראקטיבית ליצירת מודעה ב-2 דקות' },
  { id: 'properties', label: 'הנכסים שלי', Icon: Home2, desc: 'מעקב וניהול כל המודעות שפורסמו' },
  { id: 'audience', label: 'קהל', Icon: UserOctagon, desc: 'מי באמת מתעניין בדירות שלכם' },
  { id: 'calendar', label: 'היומן שלי', Icon: Calendar, desc: 'ניהול ביקורים וסיורים בדירה' },
]

export default function PublisherPortal() {
  const [user, setUser] = useState<FbUser | null>(null)
  const [ready, setReady] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [tab, setTab] = useState<TabId>('overview')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
    const u = await signInWithGoogle()
    setSigningIn(false)
    void u
  }

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center py-40">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    )
  }

  const activeTabInfo = TABS.find((t) => t.id === tab) ?? TABS[0]

  const sidebarContent = (
    <div
      className={`relative flex h-full flex-col overflow-hidden rounded-3xl border border-border-app bg-white/95 shadow-lg backdrop-blur-xl transition-all duration-300 ${
        isSidebarCollapsed ? 'w-[72px]' : 'w-[270px]'
      }`}
    >
      <div className="flex items-center justify-between border-b border-border-app p-3.5">
        {!isSidebarCollapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-deep text-white shadow-md">
              <Home2 size={20} variant="Bold" color="currentColor" />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-[15px] font-black leading-tight text-navy">Rently</span>
              <span className="block truncate text-[11px] font-bold text-primary">אזור המפרסם</span>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-deep text-white shadow-md">
            <Home2 size={20} variant="Bold" color="currentColor" />
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          aria-label={isSidebarCollapsed ? 'הרחב סרגל צד' : 'כווץ סרגל צד'}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cloud text-secondary-text transition hover:bg-primary-light2 hover:text-primary lg:flex"
        >
          <HambergerMenu size={16} color="currentColor" />
        </button>
      </div>

      <div className="p-3">
        <button
          type="button"
          onClick={() => {
            setTab('ezra')
            setSidebarOpen(false)
          }}
          className={`flex items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-white shadow-md transition hover:bg-primary-dark ${
            isSidebarCollapsed ? 'mx-auto h-10 w-10' : 'w-full px-4 py-2.5 text-[13.5px]'
          }`}
          title="הוספת דירה"
        >
          <Add size={isSidebarCollapsed ? 20 : 18} color="currentColor" />
          {!isSidebarCollapsed && <span>הוספת דירה ב-2 דקות</span>}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <div className="flex flex-col gap-1">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = tab === id
            return isSidebarCollapsed ? (
              <button
                key={id}
                type="button"
                title={label}
                onClick={() => {
                  setTab(id)
                  setSidebarOpen(false)
                }}
                className={`mx-auto flex h-10 w-10 items-center justify-center rounded-2xl transition ${
                  isActive ? 'bg-primary-light2 text-primary' : 'text-secondary-text hover:bg-cloud'
                }`}
              >
                <Icon size={20} color="currentColor" variant={isActive ? 'Bold' : 'Linear'} />
              </button>
            ) : (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id)
                  setSidebarOpen(false)
                }}
                className={`flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-start text-[13px] font-bold transition ${
                  isActive
                    ? 'border border-primary/15 bg-primary-light2 text-primary shadow-sm'
                    : 'text-secondary-text hover:bg-cloud hover:text-navy'
                }`}
              >
                <Icon size={18} color="currentColor" variant={isActive ? 'Bold' : 'Linear'} />
                <span className="truncate">{label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-border-app bg-cloud/60 p-3">
        {!isSidebarCollapsed ? (
          signedIn ? (
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-border-app bg-white p-2.5 shadow-sm">
              <div className="flex min-w-0 items-center gap-2">
                {user?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt="" className="h-8 w-8 shrink-0 rounded-full border border-border-app object-cover" />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light2 text-xs font-bold text-primary">
                    {(user?.displayName ?? 'מ')[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="block truncate text-xs font-bold text-navy">{user?.displayName || 'מפרסם'}</span>
                  <span className="block truncate text-[10px] font-semibold text-secondary-text">{user?.email}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                title="התנתקות"
                className="rounded-xl p-1.5 text-secondary-text transition hover:bg-[#FFF2F2] hover:text-coral"
              >
                <Logout size={16} color="currentColor" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGoogle}
              disabled={signingIn}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border-app bg-white px-3 py-2 text-xs font-bold text-navy shadow-sm transition hover:bg-primary-light2 hover:text-primary"
            >
              <User size={16} color="currentColor" variant="Bold" className="text-primary" />
              <span>{signingIn ? 'מתחברים…' : 'התחברות'}</span>
            </button>
          )
        ) : (
          <div className="flex justify-center">
            {signedIn ? (
              <button
                type="button"
                onClick={() => signOut()}
                title="התנתקות"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-secondary-text transition hover:bg-[#FFF2F2] hover:text-coral"
              >
                <Logout size={18} color="currentColor" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoogle}
                title="התחברות"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light2 text-primary"
              >
                <User size={18} color="currentColor" variant="Bold" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="relative flex h-full w-full gap-4 overflow-hidden p-3 md:p-4">
      <aside className="z-20 hidden shrink-0 lg:block">{sidebarContent}</aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border-app bg-white/95 shadow-lg backdrop-blur-xl">
        <header className="flex shrink-0 items-center justify-between border-b border-border-app bg-white/80 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="תפריט"
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border-app text-navy lg:hidden"
            >
              <HambergerMenu size={20} color="currentColor" />
            </button>
            <div className="hidden h-10 w-10 items-center justify-center rounded-2xl bg-primary-light2 text-primary shadow-sm sm:flex">
              <activeTabInfo.Icon size={22} variant="Bold" color="currentColor" />
            </div>
            <div>
              <h1 className="text-base font-black leading-tight text-navy">{activeTabInfo.label}</h1>
              <p className="text-xs font-semibold text-secondary-text">{activeTabInfo.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {signedIn ? (
              <div className="hidden items-center gap-2 rounded-full border border-success/20 bg-[#F0FBF5] px-3 py-1.5 text-xs font-bold text-success sm:flex">
                <ProfileCircle size={14} color="currentColor" variant="Bold" />
                <span>מחוברים</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogle}
                disabled={signingIn}
                className="hidden items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-primary-dark sm:flex"
              >
                <span>{signingIn ? 'מתחברים…' : 'התחברות'}</span>
              </button>
            )}
          </div>
        </header>

        <div className="no-scrollbar relative flex flex-1 flex-col overflow-y-auto bg-[#F8FAFC]/50">
          {tab === 'overview' && <OverviewTab user={user} />}
          {tab === 'ezra' && <EzraWorkspace />}
          {tab === 'properties' && <PropertiesTab user={user} />}
          {tab === 'audience' && <AudienceTab user={user} />}
          {tab === 'calendar' && <CalendarTab user={user} />}
        </div>
      </main>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 end-0 flex max-w-[85vw] p-2 shadow-2xl">{sidebarContent}</div>
        </div>
      )}
    </div>
  )
}

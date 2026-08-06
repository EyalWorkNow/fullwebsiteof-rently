"use client";

import { useEffect, useRef, useState } from "react";
import {
  AddCircle,
  Category,
  HambergerMenu,
  Key,
  Logout,
  MagicStar,
  ProfileCircle,
  SearchNormal1,
  User,
  TickCircle,
} from "iconsax-react";
import { useAuthGate } from "@/components/keyz/auth/AuthGate";
import { signOut } from "@/lib/live/firebase";

const NAV_LINKS = [
  { label: "חיפוש דירות", href: "/real-estate", icon: SearchNormal1 },
  { label: "אתי AI", href: "/ati", icon: MagicStar, boldIcon: true },
  { label: "שירותים", href: "/#services", icon: Category },
  { label: "בעל נכס", href: "/publisher", icon: Key },
];

export default function TopBar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isRegistered, user, requireAuth } = useAuthGate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Click outside to auto-close user dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userDropdownOpen]);

  const handlePersonalAreaClick = () => {
    if (isRegistered) {
      setUserDropdownOpen((prev) => !prev);
    } else {
      requireAuth("כדי להיכנס לאזור האישי שלך ולשמור את כל הפעולות בחשבונך", () => {
        setUserDropdownOpen(false);
      });
    }
  };

  return (
    <header className="fixed top-3 inset-x-3 md:top-4 md:inset-x-6 z-50 max-w-[1240px] mx-auto pointer-events-none">
      <div
        className={`pointer-events-auto w-full rounded-full border transition-all duration-300 ${
          scrolled
            ? "border-slate-200/90 bg-white/95 backdrop-blur-2xl shadow-[0_12px_40px_rgba(7,41,70,0.12)]"
            : "border-slate-200/70 bg-white/90 backdrop-blur-xl shadow-[0_8px_30px_rgba(7,41,70,0.08)]"
        } px-4 py-2 md:px-6 md:py-2.5`}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="/" aria-label="Rently" className="flex items-center gap-2 shrink-0">
            <img
              src="/brand/rently_logo_full.svg"
              alt="Rently"
              className="h-8 md:h-9 w-auto"
            />
          </a>

          {/* Desktop Navigation Links with Iconsax icons */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ label, href, icon: IconCmp, boldIcon }) => (
              <a
                key={href}
                href={href}
                className="flex items-center gap-2 text-[14.5px] font-bold text-slate-800 hover:text-[#0061FF] transition-colors py-1 px-2 rounded-xl hover:bg-blue-50/60"
              >
                <IconCmp
                  size={18}
                  color={boldIcon ? "#0061FF" : "currentColor"}
                  variant={boldIcon ? "Bold" : "Linear"}
                  className="shrink-0"
                />
                <span>{label}</span>
              </a>
            ))}
          </nav>

          {/* Left Actions: Personal Area & Mobile Toggle */}
          <div className="flex items-center gap-3">
            {/* Personal Area Button & Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={handlePersonalAreaClick}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-black transition shadow-sm ${
                  isRegistered
                    ? "bg-blue-50 text-[#0061FF] border border-blue-200 hover:bg-blue-100"
                    : "bg-[#0061FF] text-white hover:bg-blue-700 shadow-md"
                }`}
              >
                {isRegistered && user?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover shrink-0 border border-blue-300"
                  />
                ) : (
                  <User size={18} color="currentColor" variant="Bold" />
                )}
                <span className="max-w-[130px] truncate">
                  {isRegistered ? user?.displayName || user?.email?.split("@")[0] || "אזור אישי" : "אזור אישי"}
                </span>
                {isRegistered && (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>

              {/* Logged In User Dropdown (Closed by default, auto-closes on outside click) */}
              {userDropdownOpen && isRegistered && (
                <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xl z-50 space-y-3">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                    {user?.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.photoURL}
                        alt={user.displayName || ""}
                        className="h-10 w-10 rounded-full object-cover shrink-0 border border-blue-200 shadow-sm"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#0061FF] shrink-0 font-bold">
                        <ProfileCircle size={24} color="#0061FF" variant="Bold" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="block text-[13px] font-black text-slate-900 truncate">
                        {user?.displayName || "משתמש Rently"}
                      </span>
                      <span className="block text-[11px] font-bold text-slate-500 truncate">
                        {user?.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">
                    <TickCircle size={14} color="#059669" variant="Bold" />
                    <span>החשבון מחובר ומסונכרן בהצלחה</span>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      setUserDropdownOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
                  >
                    <span>התנתקות מהחשבון</span>
                    <Logout size={16} color="currentColor" />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-800"
              aria-label="תפריט"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <HambergerMenu size={22} color="currentColor" />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {menuOpen && (
          <div className="md:hidden mt-3 border-t border-slate-100 pt-3 pb-1">
            <div className="flex flex-col gap-1.5">
              {NAV_LINKS.map(({ label, href, icon: IconCmp, boldIcon }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-[14.5px] font-bold text-slate-800 hover:text-[#0061FF] hover:bg-blue-50 transition"
                  onClick={() => setMenuOpen(false)}
                >
                  <IconCmp size={18} color={boldIcon ? "#0061FF" : "currentColor"} variant={boldIcon ? "Bold" : "Linear"} />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

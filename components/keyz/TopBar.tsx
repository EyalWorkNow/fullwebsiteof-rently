"use client";

import { useEffect, useState } from "react";
import { HambergerMenu } from "iconsax-react";

const NAV_LINKS = [
  { label: "חיפוש דירות", href: "/real-estate" },
  { label: "אתי AI", href: "/ati" },
  { label: "שירותים", href: "/#services" },
  { label: "פרסום דירה", href: "/publish" },
  { label: "אזור בעל דירה", href: "/landlord" },
];

export default function TopBar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-white/85 backdrop-blur-xl border-b border-border-app shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1200px] mx-auto h-16 flex items-center justify-between px-4">
        <a href="/" aria-label="Rently">
          <img
            src="/brand/rently_logo_full.svg"
            alt="Rently"
            className="h-9 w-auto"
          />
        </a>

        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[15px] font-semibold text-navy hover:text-primary transition"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="/#download"
            className="bg-primary text-white rounded-full px-5 py-2.5 text-[14px] font-bold hover:bg-primary-dark transition"
          >
            הורדת האפליקציה
          </a>
          <button
            type="button"
            className="md:hidden text-navy"
            aria-label="תפריט"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <HambergerMenu size={26} color="currentColor" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden max-w-[1200px] mx-auto px-4 pb-3">
          <div className="bg-white rounded-2xl card-shadow p-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="py-2.5 px-3 rounded-xl text-[15px] font-semibold text-navy hover:text-primary hover:bg-primary-light2 transition"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

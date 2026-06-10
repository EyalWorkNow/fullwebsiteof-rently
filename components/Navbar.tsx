"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { HambergerMenu, CloseSquare, Global } from "iconsax-react";
import { useTranslation } from "@/contexts/LanguageContext";
import { Lang, langMeta } from "@/lib/translations";

const LANGS = Object.entries(langMeta) as [Lang, { flag: string; label: string }][];

export default function Navbar() {
  const { t, lang, setLang } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const links = [
    { href: "#problem",   label: t.nav.problem   },
    { href: "#how",       label: t.nav.how       },
    { href: "#features",  label: t.nav.features  },
    { href: "#solution",  label: t.nav.solution  },
    { href: "#audiences", label: t.nav.audiences },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const ids = links.map(l => l.href.slice(1));
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(`#${e.target.id}`); }),
      { rootMargin: "-40% 0px -55% 0px" }
    );
    ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed top-4 right-4 left-4 z-50 rounded-2xl transition-all duration-500"
      style={{
        maxWidth: 1152, margin: "16px auto",
        background: scrolled ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.55)",
        backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
        border: scrolled ? "1px solid rgba(255,255,255,0.85)" : "1px solid rgba(255,255,255,0.4)",
        boxShadow: scrolled ? "0 8px 32px rgba(26,43,74,0.08), 0 1px 0 rgba(255,255,255,0.9) inset" : "none",
      }}>

      <div className="flex items-center justify-between px-5 py-3 gap-4">
        <a href="#" aria-label="Rently">
          <Image src="/logo.png" alt="Rently" width={110} height={36} priority style={{ height: "auto" }} />
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-5 flex-1 justify-center">
          {links.map(l => (
            <a key={l.href} href={l.href}
              className="relative text-sm font-semibold transition-colors duration-200 cursor-pointer py-1"
              style={{ color: active === l.href ? "#17BDB0" : "rgba(26,43,74,0.6)" }}>
              {l.label}
              {active === l.href && (
                <motion.span layoutId="nav-line"
                  className="absolute -bottom-0.5 right-0 left-0 h-0.5 rounded-full"
                  style={{ background: "#17BDB0" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }} />
              )}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2.5">
          {/* Language picker */}
          <div ref={langRef} className="relative">
            <motion.button
              onClick={() => setLangOpen(v => !v)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors duration-200"
              style={{
                background: langOpen ? "rgba(23,189,176,0.1)" : "rgba(26,43,74,0.05)",
                color: langOpen ? "#17BDB0" : "rgba(26,43,74,0.6)",
                border: `1px solid ${langOpen ? "rgba(23,189,176,0.3)" : "rgba(26,43,74,0.08)"}`,
              }}>
              <Global size={14} color={langOpen ? "#17BDB0" : "rgba(26,43,74,0.5)"} variant="Bold" />
              <span>{langMeta[lang].flag}</span>
              <span className="text-xs">{langMeta[lang].label}</span>
            </motion.button>

            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -8 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className="absolute top-full mt-2 rounded-2xl overflow-hidden shadow-xl z-50"
                  style={{
                    background: "rgba(255,255,255,0.97)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    backdropFilter: "blur(20px)",
                    minWidth: 150,
                    // position relative to RTL/LTR
                    insetInlineStart: 0,
                  }}>
                  {LANGS.map(([code, meta], i) => (
                    <motion.button key={code}
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => { setLang(code); setLangOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors duration-150 text-start"
                      style={{
                        background: lang === code ? "rgba(23,189,176,0.08)" : "transparent",
                        color: lang === code ? "#17BDB0" : "#334155",
                        fontWeight: lang === code ? "700" : "500",
                      }}>
                      <span className="text-base">{meta.flag}</span>
                      <span>{meta.label}</span>
                      {lang === code && (
                        <span className="ml-auto mr-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: "#17BDB0" }} />
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.a href="#download"
            whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className="relative text-white text-sm font-bold px-5 py-2.5 rounded-xl cursor-pointer overflow-hidden"
            style={{ background: "linear-gradient(135deg, #17BDB0, #0F8A80)", boxShadow: "0 4px 16px rgba(23,189,176,0.3)" }}>
            <span className="absolute inset-0 shimmer-bg opacity-30 pointer-events-none" />
            <span className="relative">{t.nav.cta}</span>
          </motion.a>
        </div>

        {/* Mobile: lang + menu */}
        <div className="md:hidden flex items-center gap-2">
          <motion.button
            onClick={() => setLangOpen(v => !v)}
            whileTap={{ scale: 0.9 }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm cursor-pointer"
            style={{ background: "rgba(23,189,176,0.08)", color: "#0F8A80" }}>
            <span>{langMeta[lang].flag}</span>
            <span className="text-[11px] font-bold">{langMeta[lang].label.slice(0, 3)}</span>
          </motion.button>

          <motion.button whileTap={{ scale: 0.9 }}
            className="p-2 rounded-xl cursor-pointer"
            style={{ color: "rgba(26,43,74,0.7)" }}
            onClick={() => { setOpen(!open); setLangOpen(false); }} aria-label="Menu">
            {open ? <CloseSquare size={24} /> : <HambergerMenu size={24} />}
          </motion.button>
        </div>
      </div>

      {/* Mobile lang dropdown */}
      <AnimatePresence>
        {langOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="md:hidden overflow-hidden"
            style={{ borderTop: "1px solid rgba(23,189,176,0.15)" }}>
            <div className="px-4 py-3 grid grid-cols-5 gap-2">
              {LANGS.map(([code, meta]) => (
                <button key={code} onClick={() => { setLang(code); setLangOpen(false); }}
                  className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  style={{
                    background: lang === code ? "rgba(23,189,176,0.1)" : "rgba(26,43,74,0.03)",
                    color: lang === code ? "#17BDB0" : "#64748B",
                    border: `1px solid ${lang === code ? "rgba(23,189,176,0.3)" : "transparent"}`,
                  }}>
                  <span className="text-xl">{meta.flag}</span>
                  <span className="text-[10px]">{meta.label.slice(0, 5)}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile nav menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28 }}
            className="md:hidden overflow-hidden"
            style={{ borderTop: "1px solid rgba(255,255,255,0.5)" }}>
            <div className="px-5 py-4 flex flex-col gap-2">
              {links.map((l, i) => (
                <motion.a key={l.href} href={l.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="text-sm font-semibold py-2 px-3 rounded-xl cursor-pointer"
                  style={{ color: active === l.href ? "#17BDB0" : "rgba(26,43,74,0.8)", background: active === l.href ? "rgba(23,189,176,0.08)" : "transparent" }}>
                  {l.label}
                </motion.a>
              ))}
              <motion.a href="#download" onClick={() => setOpen(false)}
                initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: links.length * 0.06 }}
                className="mt-1 text-center text-white text-sm font-bold px-5 py-3 rounded-xl cursor-pointer"
                style={{ background: "linear-gradient(135deg, #17BDB0, #0F8A80)" }}>
                {t.nav.cta}
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

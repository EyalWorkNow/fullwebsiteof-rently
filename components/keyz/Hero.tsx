"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CloseCircle,
  MagicStar,
  SearchNormal1,
  Location,
  ChartSquare,
  DocumentText,
  Flash,
  ShieldSecurity,
} from "iconsax-react";
import styled from "styled-components";
import { fetchProperties, type PropertiesResult } from "@/lib/live/api";
import { buildReply, parseQuery, rankProperties } from "@/lib/live/smart-search";
import type { Property } from "@/lib/live/types";
import PropertyCard from "./PropertyCard";
import ListingCarousel from "./ListingCarousel";
import { useAuthGate } from "./auth/AuthGate";

// ── Hero Liquid Animated Search Button (Rently Blue Palette) ─────────────────
function HeroAiSearchButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ opacity: disabled ? 0.6 : 1 }}>
      {mounted ? (
        <StyledUiverseWrapper>
          <button className="uiverse" type="submit" disabled={disabled}>
            <div className="wrapper">
              <span>{children}</span>
              <div className="circle circle-12" />
              <div className="circle circle-11" />
              <div className="circle circle-10" />
              <div className="circle circle-9" />
              <div className="circle circle-8" />
              <div className="circle circle-7" />
              <div className="circle circle-6" />
              <div className="circle circle-5" />
              <div className="circle circle-4" />
              <div className="circle circle-3" />
              <div className="circle circle-2" />
              <div className="circle circle-1" />
            </div>
          </button>
        </StyledUiverseWrapper>
      ) : (
        <button
          className="rounded-[24px] bg-[#0061FF] px-5 py-2 text-[15px] font-bold text-white shadow-md"
          type="submit"
          disabled={disabled}
        >
          <span>{children}</span>
        </button>
      )}
    </div>
  );
}

const StyledUiverseWrapper = styled.div`
  .uiverse {
    --duration: 7s;
    --easing: linear;
    --c-color-1: rgba(56, 182, 255, 0.75);
    --c-color-2: #0061FF;
    --c-color-3: #00D2FF;
    --c-color-4: rgba(0, 97, 255, 0.85);
    --c-shadow: rgba(0, 97, 255, 0.4);
    --c-shadow-inset-top: rgba(186, 230, 253, 0.9);
    --c-shadow-inset-bottom: rgba(0, 97, 255, 0.8);
    --c-radial-inner: #0061FF;
    --c-radial-outer: #38B6FF;
    --c-color: #ffffff;
    -webkit-tap-highlight-color: transparent;
    -webkit-appearance: none;
    outline: none;
    position: relative;
    cursor: pointer;
    border: none;
    display: table;
    border-radius: 24px;
    padding: 0;
    margin: 0;
    text-align: center;
    font-family: "SF Hebrew Rounded", -apple-system, BlinkMacSystemFont, sans-serif;
    font-weight: 700;
    font-size: 15px;
    letter-spacing: 0.02em;
    line-height: 1.5;
    color: var(--c-color);
    background: radial-gradient(
      circle,
      var(--c-radial-inner),
      var(--c-radial-outer) 80%
    );
    box-shadow: 0 0 14px var(--c-shadow);
  }

  .uiverse:before {
    content: "";
    pointer-events: none;
    position: absolute;
    z-index: 3;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    border-radius: 24px;
    box-shadow:
      inset 0 3px 12px var(--c-shadow-inset-top),
      inset 0 -3px 4px var(--c-shadow-inset-bottom);
  }

  .uiverse .wrapper {
    -webkit-mask-image: -webkit-radial-gradient(white, black);
    overflow: hidden;
    border-radius: 24px;
    min-width: 112px;
    padding: 10px 22px;
  }

  .uiverse .wrapper span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    position: relative;
    z-index: 1;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);

    svg {
      filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.85));
    }
  }

  .uiverse:hover {
    --duration: 1400ms;
  }

  .uiverse .wrapper .circle {
    position: absolute;
    left: 0;
    top: 0;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    filter: blur(var(--blur, 8px));
    background: var(--background, transparent);
    transform: translate(var(--x, 0), var(--y, 0)) translateZ(0);
    animation: var(--animation, none) var(--duration) var(--easing) infinite;
  }

  .uiverse .wrapper .circle.circle-1,
  .uiverse .wrapper .circle.circle-9,
  .uiverse .wrapper .circle.circle-10 {
    --background: var(--c-color-4);
  }

  .uiverse .wrapper .circle.circle-3,
  .uiverse .wrapper .circle.circle-4 {
    --background: var(--c-color-2);
    --blur: 14px;
  }

  .uiverse .wrapper .circle.circle-5,
  .uiverse .wrapper .circle.circle-6 {
    --background: var(--c-color-3);
    --blur: 16px;
  }

  .uiverse .wrapper .circle.circle-2,
  .uiverse .wrapper .circle.circle-7,
  .uiverse .wrapper .circle.circle-8,
  .uiverse .wrapper .circle.circle-11,
  .uiverse .wrapper .circle.circle-12 {
    --background: var(--c-color-1);
    --blur: 12px;
  }

  .uiverse .wrapper .circle.circle-1 {
    --x: 0;
    --y: -40px;
    --animation: circle-1;
  }

  .uiverse .wrapper .circle.circle-2 {
    --x: 92px;
    --y: 8px;
    --animation: circle-2;
  }

  .uiverse .wrapper .circle.circle-3 {
    --x: -12px;
    --y: -12px;
    --animation: circle-3;
  }

  .uiverse .wrapper .circle.circle-4 {
    --x: 80px;
    --y: -12px;
    --animation: circle-4;
  }

  .uiverse .wrapper .circle.circle-5 {
    --x: 12px;
    --y: -4px;
    --animation: circle-5;
  }

  .uiverse .wrapper .circle.circle-6 {
    --x: 56px;
    --y: 16px;
    --animation: circle-6;
  }

  .uiverse .wrapper .circle.circle-7 {
    --x: 8px;
    --y: 28px;
    --animation: circle-7;
  }

  .uiverse .wrapper .circle.circle-8 {
    --x: 28px;
    --y: -4px;
    --animation: circle-8;
  }

  .uiverse .wrapper .circle.circle-9 {
    --x: 20px;
    --y: -12px;
    --animation: circle-9;
  }

  .uiverse .wrapper .circle.circle-10 {
    --x: 64px;
    --y: 16px;
    --animation: circle-10;
  }

  .uiverse .wrapper .circle.circle-11 {
    --x: 4px;
    --y: 4px;
    --animation: circle-11;
  }

  .uiverse .wrapper .circle.circle-12 {
    --blur: 14px;
    --x: 52px;
    --y: 4px;
    --animation: circle-12;
  }

  @keyframes circle-1 {
    33% {
      transform: translate(0px, 16px) translateZ(0);
    }

    66% {
      transform: translate(12px, 64px) translateZ(0);
    }
  }

  @keyframes circle-2 {
    33% {
      transform: translate(80px, -10px) translateZ(0);
    }

    66% {
      transform: translate(72px, -48px) translateZ(0);
    }
  }

  @keyframes circle-3 {
    33% {
      transform: translate(20px, 12px) translateZ(0);
    }

    66% {
      transform: translate(12px, 4px) translateZ(0);
    }
  }

  @keyframes circle-4 {
    33% {
      transform: translate(76px, -12px) translateZ(0);
    }

    66% {
      transform: translate(112px, -8px) translateZ(0);
    }
  }

  @keyframes circle-5 {
    33% {
      transform: translate(84px, 28px) translateZ(0);
    }

    66% {
      transform: translate(40px, -32px) translateZ(0);
    }
  }

  @keyframes circle-6 {
    33% {
      transform: translate(28px, -16px) translateZ(0);
    }

    66% {
      transform: translate(76px, -56px) translateZ(0);
    }
  }

  @keyframes circle-7 {
    33% {
      transform: translate(8px, 28px) translateZ(0);
    }

    66% {
      transform: translate(20px, -60px) translateZ(0);
    }
  }

  @keyframes circle-8 {
    33% {
      transform: translate(32px, -4px) translateZ(0);
    }

    66% {
      transform: translate(56px, -20px) translateZ(0);
    }
  }

  @keyframes circle-9 {
    33% {
      transform: translate(20px, -12px) translateZ(0);
    }

    66% {
      transform: translate(80px, -8px) translateZ(0);
    }
  }

  @keyframes circle-10 {
    33% {
      transform: translate(68px, 20px) translateZ(0);
    }

    66% {
      transform: translate(100px, 28px) translateZ(0);
    }
  }

  @keyframes circle-11 {
    33% {
      transform: translate(4px, 4px) translateZ(0);
    }

    66% {
      transform: translate(68px, 20px) translateZ(0);
    }
  }

  @keyframes circle-12 {
    33% {
      transform: translate(56px, 0px) translateZ(0);
    }

    66% {
      transform: translate(60px, -32px) translateZ(0);
    }
  }
`;

interface HeroSearchResult {
  reply: string;
  listings: Property[];
  live: boolean; // false = the property fetch fell back to sample data
}

// The property list is fetched ONCE per page load and shared across searches —
// after the first search, אתי answers instantly (on-device engine, no backend).
let propertiesPromise: Promise<PropertiesResult> | null = null;
function ensureProperties(): Promise<PropertiesResult> {
  propertiesPromise ??= fetchProperties(500);
  return propertiesPromise;
}

// The app's on-device "אתי fast mode": parse the free Hebrew text locally, rank
// the live catalogue locally, phrase the reply locally. No /assistant call.
async function localFastSearch(query: string): Promise<HeroSearchResult> {
  const { items, live } = await ensureProperties();
  const parsed = parseQuery(query);
  const ranked = rankProperties(parsed, items, 8);
  return {
    reply: buildReply(parsed, ranked),
    // Surface the engine's Hebrew tags (📍 / 🚉 / amenity) on the cards — the
    // PropertyCard already renders emoji-prefixed geo tags from smartTags.
    listings: ranked.map((r) => ({
      ...r.property,
      smartTags: [...r.tags, ...(r.property.smartTags ?? [])],
    })),
    live,
  };
}

const ROTATING_PLACEHOLDERS = [
  "למשל: דירת 3 חדרים בתל אביב עד 7,500 ₪ עם מרפסת וחניה...",
  "למשל: דירת שותפים ל-3 בתל אביב עד 7,000 ₪ ושמותר חיות מחמד...",
  "למשל: 4 חדרים שקטה ברמת גן ליד פארק ובית ספר יסודי עד 6,800 ₪...",
  "למשל: דירת גן בגבעתיים לזוג צעיר עד 5,800 ₪ ליד תחבורה ציבורית...",
];

const CHIPS = [
  "דירת 3 חדרים בתל אביב עם מרפסת",
  "עד 6,500 ₪ ליד רכבת קלה",
  "דירה שקטה ליד פארק",
  "4 חדרים מרוהטת בגבעתיים",
];

const rise = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

// Sending a search is the meaningful action — browsing the page never asks.
const SEARCH_REASON = "כדי לשמור את החיפוש ולקבל התאמות אישיות";

export default function Hero() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<HeroSearchResult | null>(null);
  const [typedPlaceholder, setTypedPlaceholder] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeMode, setActiveMode] = useState<"fast" | "deep" | "contract">("fast");
  const { requireAuth } = useAuthGate();

  // Typewriter effect: types character-by-character, pauses, then backspaces
  useEffect(() => {
    const currentText = ROTATING_PLACEHOLDERS[placeholderIdx];

    let speed = isDeleting ? 22 : 45;

    if (!isDeleting && typedPlaceholder === currentText) {
      speed = 2200; // Pause at end of sentence
    } else if (isDeleting && typedPlaceholder === "") {
      setIsDeleting(false);
      setPlaceholderIdx((prev) => (prev + 1) % ROTATING_PLACEHOLDERS.length);
      speed = 400; // Pause before starting next sentence
      return;
    }

    const timer = setTimeout(() => {
      if (!isDeleting && typedPlaceholder !== currentText) {
        setTypedPlaceholder(currentText.slice(0, typedPlaceholder.length + 1));
      } else if (isDeleting && typedPlaceholder !== "") {
        setTypedPlaceholder(currentText.slice(0, typedPlaceholder.length - 1));
      } else if (!isDeleting && typedPlaceholder === currentText) {
        setIsDeleting(true);
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [typedPlaceholder, isDeleting, placeholderIdx]);

  const runSearch = (q: string) => {
    setSearching(true);
    setResult(null);
    localFastSearch(q)
      .then(setResult)
      .finally(() => setSearching(false));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim() || ROTATING_PLACEHOLDERS[placeholderIdx].replace("למשל: ", "");
    if (!q || searching) return;
    requireAuth(SEARCH_REASON, () => runSearch(q));
  };

  const runChip = (chip: string) => {
    setQuery(chip);
    if (searching) return;
    requireAuth(SEARCH_REASON, () => runSearch(chip));
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#EFF6FF] via-slate-50/50 to-white pt-28 pb-16 md:pt-36 md:pb-20">
      {/* Decorative glows & tech grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-tr from-blue-200/30 via-indigo-100/20 to-[#38B6FF]/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0061ff08_1px,transparent_1px),linear-gradient(to_bottom,#0061ff0a_1px,transparent_1px)] bg-[size:3.5rem_3.5rem]"
      />

      <div className="relative mx-auto max-w-[860px] px-4 text-center z-10">
        {/* 1. Enlarged 3D Iridescent Orb / Coin */}
        <motion.div {...rise} transition={{ duration: 0.5, delay: 0 }} className="flex items-center justify-center my-3">
          <div className="relative flex items-center justify-center">
            {/* Multi-layered Glowing Aura */}
            <div className="absolute h-48 w-48 rounded-full bg-gradient-to-r from-[#38B6FF]/35 via-[#0061FF]/30 to-[#38B6FF]/35 blur-3xl animate-pulse" />
            <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-gradient-to-tr from-sky-300 via-blue-200 to-sky-400 p-1 shadow-[0_15px_45px_rgba(0,97,255,0.35)] transition-transform duration-700 hover:scale-108">
              <div className="h-full w-full rounded-full bg-gradient-to-br from-white via-sky-50 to-blue-100 backdrop-blur-md relative overflow-hidden flex items-center justify-center border-2 border-white/80">
                <div className="absolute -top-4 -left-4 h-14 w-14 rounded-full bg-white/90 blur-sm" />
                <div className="absolute bottom-2 right-3 h-9 w-9 rounded-full bg-sky-400/30 blur-md" />
                <div className="absolute top-6 right-4 h-5 w-5 rounded-full bg-blue-400/25 blur-sm" />
                <MagicStar size={42} variant="Bold" color="currentColor" className="text-[#0061FF] drop-shadow-md relative z-10 animate-spin-slow" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* 2. Ultra-Sleek Segmented Model Switcher Toggle */}
        <motion.div {...rise} transition={{ duration: 0.5, delay: 0.04 }} className="flex justify-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-blue-200/90 bg-white/95 p-1.5 shadow-md backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setActiveMode("fast")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-black transition-all duration-200 cursor-pointer ${
                activeMode === "fast"
                  ? "bg-[#0061FF] text-white shadow-md shadow-blue-500/20 scale-[1.02]"
                  : "text-slate-600 hover:text-[#0061FF] hover:bg-blue-50/60"
              }`}
            >
              <Flash size={16} variant="Bold" />
              <span>אתי Fast</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode("deep")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-black transition-all duration-200 cursor-pointer ${
                activeMode === "deep"
                  ? "bg-[#0061FF] text-white shadow-md shadow-blue-500/20 scale-[1.02]"
                  : "text-slate-600 hover:text-[#0061FF] hover:bg-blue-50/60"
              }`}
            >
              <MagicStar size={16} variant="Bold" />
              <span>אתי Deep Intel</span>
            </button>
          </div>
        </motion.div>

        {/* 3. Hero CTA Spotlight Badge (Under Toggle, No Sparkles) */}
        <motion.div {...rise} transition={{ duration: 0.5, delay: 0.08 }} className="flex justify-center mt-3.5">
          <motion.a
            href="/publish"
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/90 bg-gradient-to-r from-blue-50 via-white to-blue-50 px-5 py-2 text-[13px] sm:text-[13.5px] font-black text-[#0061FF] shadow-xs transition-all hover:border-[#0061FF] hover:bg-blue-100/60 hover:shadow-md cursor-pointer"
          >
            <span>משכירים או מוכרים? פרסמו דירה בחינם ב-2 דקות ←</span>
          </motion.a>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...rise}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-4 text-3xl sm:text-5xl md:text-6xl font-black leading-tight text-navy tracking-tight"
        >
          כיף שבאת, איזו{' '}
          <span className="bg-gradient-to-r from-[#0061FF] via-[#38B6FF] to-blue-600 bg-clip-text text-transparent">
            דירה
          </span>{' '}
          נחפש היום?
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          {...rise}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="mt-3 text-base sm:text-lg font-semibold text-secondary-text max-w-[580px] mx-auto leading-relaxed"
        >
          ספרו לאתי מה חשוב לכם ותבדוק אם היא באמת עוזרת חכמה
        </motion.p>

        {/* Capability Selectable Tags Bar (Sleek, Compact Tag Pills) */}
        <motion.div {...rise} transition={{ duration: 0.5, delay: 0.22 }} className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 max-w-[840px] mx-auto">
          <button
            type="button"
            onClick={() => {
              setActiveMode("fast");
              runChip('דירת 3 חדרים בתל אביב עם מרפסת וחניה עד 7,500 ₪');
            }}
            className={`group relative flex items-center gap-2.5 px-4 py-2.5 rounded-full border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md ${
              activeMode === "fast"
                ? "border-[#0061FF] bg-blue-50/90 text-[#0061FF] ring-2 ring-blue-100"
                : "border-slate-200/90 bg-white/95 text-navy hover:border-[#0061FF] hover:text-[#0061FF]"
            }`}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100/80 text-[#0061FF] shrink-0">
              <Location size={16} variant="Bold" color="#0061FF" />
            </div>
            <span className="text-[13.5px] font-black tracking-tight">חיפוש דירות חכם</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode("deep");
              runChip('בצע השוואת מחירי שוק מול דירות דומות באזור');
            }}
            className={`group relative flex items-center gap-2.5 px-4 py-2.5 rounded-full border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md ${
              activeMode === "deep"
                ? "border-[#0061FF] bg-blue-50/90 text-[#0061FF] ring-2 ring-blue-100"
                : "border-slate-200/90 bg-white/95 text-navy hover:border-[#0061FF] hover:text-[#0061FF]"
            }`}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100/80 text-[#0061FF] shrink-0">
              <ChartSquare size={16} variant="Bold" color="#0061FF" />
            </div>
            <span className="text-[13.5px] font-black tracking-tight">השוואת מחירי שוק</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode("contract");
              runChip('אני רוצה להתייעץ ולנתח חוזה שכירות');
            }}
            className={`group relative flex items-center gap-2.5 px-4 py-2.5 rounded-full border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md ${
              activeMode === "contract"
                ? "border-[#0061FF] bg-blue-50/90 text-[#0061FF] ring-2 ring-blue-100"
                : "border-slate-200/90 bg-white/95 text-navy hover:border-[#0061FF] hover:text-[#0061FF]"
            }`}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100/80 text-[#0061FF] shrink-0">
              <DocumentText size={16} variant="Bold" color="#0061FF" />
            </div>
            <span className="text-[13.5px] font-black tracking-tight">סורק חוזה שכירות</span>
          </button>
        </motion.div>

        {/* Command Center Prompt Box */}
        <motion.div {...rise} transition={{ duration: 0.5, delay: 0.28 }}>
          <form
            onSubmit={handleSubmit}
            className="relative mt-6 rounded-3xl border-2 border-blue-200/90 bg-white p-3 sm:p-4 md:p-5 shadow-[0_20px_50px_rgba(0,97,255,0.12)] backdrop-blur-2xl transition-all duration-200 focus-within:border-[#0061FF] focus-within:ring-4 focus-within:ring-blue-100 max-w-[840px] mx-auto text-start"
          >
            {/* Text Input Row */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#0061FF]">
                <MagicStar size={22} variant="Bold" color="#0061FF" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={typedPlaceholder || "למשל: ספרו לאתי מה תרצו..."}
                className="w-full min-w-0 bg-transparent text-[15px] sm:text-[16px] md:text-[17px] font-medium text-navy outline-none placeholder:text-slate-400 leading-relaxed py-2"
              />

              {/* Attach Contract PDF Quick Button */}
              <button
                type="button"
                onClick={() => runChip('אני רוצה להעלות ולנתח חוזה שכירות ב-PDF')}
                className="hidden sm:flex shrink-0 items-center gap-1 rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-1.5 text-[12px] font-extrabold text-slate-700 transition hover:border-[#0061FF] hover:bg-blue-50/60 hover:text-[#0061FF] cursor-pointer"
                title="העלאת חוזה שכירות PDF"
              >
                <DocumentText size={15} color="#0061FF" variant="Bold" />
                <span>צרף חוזה</span>
              </button>

              <HeroAiSearchButton disabled={searching}>
                <span>{searching ? "מחפשת…" : "חיפוש"}</span>
                <SearchNormal1
                  size={20}
                  color="currentColor"
                  className="shrink-0 filter drop-shadow-[0_2px_5px_rgba(0,0,0,0.85)] ms-1"
                />
              </HeroAiSearchButton>
            </div>

            {/* Attached Quick Chips Inside Footer */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => runChip(chip)}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-1.5 text-[12px] font-extrabold text-slate-700 transition hover:border-[#0061FF] hover:bg-blue-50/50 hover:text-[#0061FF] cursor-pointer"
                >
                  <span>{chip}</span>
                </button>
              ))}
            </div>
          </form>

          {/* Integrated Trust & Proof Ticker Strip */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[12.5px] font-bold text-secondary-text">
            <span className="flex items-center gap-1.5">
              <ShieldSecurity size={16} color="#0061FF" variant="Bold" />
              <span>סריקת 14,200+ דירות פעילות</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <Flash size={16} color="#0061FF" variant="Bold" />
              <span>מענה AI ב-0.4 שניות</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <MagicStar size={16} color="#0061FF" variant="Bold" />
              <span>נתוני למ״ר ומפות רשמיות</span>
            </span>
          </div>

          {searching && (
            <div className="mx-auto mt-8 flex max-w-[820px] items-center gap-3 rounded-3xl border border-border-app bg-white p-5 text-start card-shadow">
              <MagicStar size={20} variant="Bold" color="currentColor" className="shrink-0 animate-pulse text-primary" />
              <span className="text-[14px] font-semibold text-secondary-text">
                אתי סורקת את הדירות הפעילות…
              </span>
            </div>
          )}

          {result && !searching && (
            <div className="mt-8 text-start">
              <div className="mx-auto max-w-[820px] rounded-3xl border border-border-app bg-white p-5 card-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light2">
                      <MagicStar size={18} variant="Bold" color="currentColor" className="text-primary" />
                    </span>
                    <div>
                      <p className="text-[12px] font-bold text-primary">אתי</p>
                      <p className="mt-0.5 text-[14.5px] font-semibold leading-relaxed text-navy">
                        {result.reply || "הנה מה שמצאתי:"}
                      </p>
                      {!result.live && (
                        <p className="mt-1 text-[11.5px] font-semibold text-secondary-text">
                          (נתוני דוגמה)
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="סגירת תוצאות"
                    onClick={() => setResult(null)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center text-secondary-text transition hover:text-coral"
                  >
                    <CloseCircle size={20} color="currentColor" />
                  </button>
                </div>
              </div>

              {result.listings.length > 0 && (
                <ListingCarousel listings={result.listings} className="mt-4" />
              )}

              <p className="mt-3 text-center text-[13px] font-bold">
                <a href="/real-estate" className="text-primary hover:underline">
                  לכל הדירות עם סינון מלא ←
                </a>
              </p>
            </div>
          )}

          <p className="mt-6 text-[13px] text-secondary-text">
            החיפוש המלא עם אתי זמין באפליקציה{" "}
            <a href="#download" className="font-bold text-primary">
              להורדה ←
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

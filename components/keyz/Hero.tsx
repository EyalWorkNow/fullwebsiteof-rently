"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  SearchNormal1,
  Microphone2,
  ShieldSecurity,
  Flash,
  MagicStar,
} from "iconsax-react";
import styled from "styled-components";
import { fetchProperties, type PropertiesResult } from "@/lib/live/api";
import { buildReply, parseQuery, rankProperties } from "@/lib/live/smart-search";
import type { Property } from "@/lib/live/types";
import PropertyCard from "./PropertyCard";
import ListingCarousel from "./ListingCarousel";

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

export default function Hero() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<HeroSearchResult | null>(null);
  const [typedPlaceholder, setTypedPlaceholder] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeMode, setActiveMode] = useState<"fast" | "deep" | "contract">("fast");

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
    const modeParam = activeMode ? `&mode=${activeMode}` : '&mode=fast';
    window.location.href = `/ati?q=${encodeURIComponent(q)}${modeParam}`;
  };

  // Fast search (this bar's only mode - activeMode never actually changes
  // from "fast", there's no UI toggle wired to setActiveMode) is meant to be
  // open to anyone, same as browsing /real-estate. Only the אתי conversation
  // itself (guardedSend in AtiWorkspace.tsx) should ask for an account -
  // this bar was wrongly gating the search that leads INTO that page too.
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim() || ROTATING_PLACEHOLDERS[placeholderIdx].replace("למשל: ", "");
    if (!q) return;
    runSearch(q);
  };

  const runChip = (chip: string) => {
    setQuery(chip);
    runSearch(chip);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#EFF6FF] via-slate-50/50 to-white pt-28 pb-16 md:pt-36 md:pb-20">
      {/* Decorative ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-tr from-blue-200/30 via-indigo-100/20 to-[#38B6FF]/20 blur-3xl"
      />

      {/* 3D Jumping House Background Video (Top Right in RTL) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-28 sm:-right-40 md:-right-52 lg:-right-48 -top-2 sm:-top-4 md:-top-6 lg:-top-8 z-0 w-[378px] sm:w-[566px] md:w-[680px] lg:w-[780px] max-w-none select-none opacity-[0.25] transition-all"
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-auto w-full object-contain filter drop-shadow-[0_20px_35px_rgba(37,99,235,0.15)]"
        >
          <source src="/jumping-house.mov" type="video/mp4" />
          <source src="/jumping-house.mov" type="video/quicktime" />
          <source src="/%D7%91%D7%99%D7%AA%20%D7%A7%D7%95%D7%A4%D7%A5.mov" type="video/quicktime" />
        </video>
      </div>

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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/rently-icon.svg"
                  alt="Rently Icon"
                  className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-md relative z-10 transition-transform duration-300 hover:scale-105"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...rise}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-4 text-3xl sm:text-5xl md:text-6xl font-black leading-tight text-navy tracking-tight"
        >
          איזה כיף שחזרת!
          <br />
          מה אנחנו{' '}
          <span className="bg-gradient-to-r from-[#0061FF] via-[#38B6FF] to-blue-600 bg-clip-text text-transparent">
            מחפשים
          </span>{' '}
          היום?
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          {...rise}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="mt-3 text-base sm:text-lg font-semibold text-secondary-text max-w-[580px] mx-auto leading-relaxed"
        >
          ספרו לאתי מה חשוב לכם ותבדוק אם היא באמת עוזרת חכמה
        </motion.p>

        {/* Command Center Prompt Box */}
        <motion.div {...rise} transition={{ duration: 0.5, delay: 0.28 }}>
          <form
            onSubmit={handleSubmit}
            className="relative mt-6 rounded-full border-2 border-blue-200/90 bg-white px-3 py-2 sm:px-4 sm:py-2.5 shadow-[0_20px_50px_rgba(0,97,255,0.12)] backdrop-blur-2xl transition-all duration-200 focus-within:border-[#0061FF] focus-within:ring-4 focus-within:ring-blue-100 max-w-[680px] mx-auto text-start"
          >
            {/* Text Input Row - In RTL layout, Right side buttons (Right to Left flow) */}
            <div className="flex items-center gap-[10px]">
              {/* Input Area with Typing Placeholder */}
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={typedPlaceholder || "למשל: ספרו לאתי מה תרצו..."}
                className="w-full min-w-0 bg-transparent text-[15px] sm:text-[16px] font-medium text-navy outline-none placeholder:text-slate-400 leading-relaxed py-1.5 text-right px-2"
              />

              {/* Right Side Buttons */}
              <div className="flex items-center gap-[10px] shrink-0">
                <button
                  type="button"
                  onClick={() => runChip('הקלטה קולית: אתי, מצאי לי דירת 3 חדרים')}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-slate-50/90 text-slate-600 transition hover:border-[#0061FF] hover:bg-blue-50/80 hover:text-[#0061FF] cursor-pointer"
                  title="הקלטה קולית לאתי"
                  aria-label="הקלטה קולית לאתי"
                >
                  <Microphone2 size={19} variant="Bold" color="currentColor" />
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

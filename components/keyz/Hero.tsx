"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CloseCircle, MagicStar, SearchNormal1 } from "iconsax-react";
import { fetchProperties, type PropertiesResult } from "@/lib/live/api";
import { buildReply, parseQuery, rankProperties } from "@/lib/live/smart-search";
import type { Property } from "@/lib/live/types";
import PropertyCard from "./PropertyCard";

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

const CHIPS = [
  "דירת 3 חדרים עם מרפסת בתל אביב",
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setResult(null);
    try {
      setResult(await localFastSearch(q));
    } finally {
      setSearching(false);
    }
  };

  const runChip = (chip: string) => {
    setQuery(chip);
    if (searching) return;
    setSearching(true);
    setResult(null);
    localFastSearch(chip)
      .then(setResult)
      .finally(() => setSearching(false));
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#EFF6FF] via-white to-white pt-32 pb-16">
      {/* Decorative blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -start-24 h-[380px] w-[380px] rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-32 -end-24 h-[320px] w-[320px] rounded-full bg-[#38B6FF]/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-[860px] px-4 text-center">
        <motion.div {...rise} transition={{ duration: 0.5, delay: 0 }}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-app bg-white px-4 py-1.5 text-[13px] font-bold text-primary badge-shadow">
            <MagicStar size={16} variant="Bold" color="currentColor" />
            חיפוש דירות מבוסס AI
          </span>
        </motion.div>

        <motion.h1
          {...rise}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-5 text-4xl font-black leading-tight text-navy md:text-6xl"
        >
          כיף שבאת, איזו <span className="text-primary">דירה</span> נחפש היום?
        </motion.h1>

        <motion.p
          {...rise}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="mt-4 text-lg text-secondary-text"
        >
          ספרו לאתי מה חשוב לכם — והיא תמצא דירות אמיתיות שמתאימות בדיוק לכם
        </motion.p>

        <motion.div {...rise} transition={{ duration: 0.5, delay: 0.24 }}>
          <form
            onSubmit={handleSubmit}
            className="card-shadow mx-auto mt-8 flex max-w-[680px] items-center gap-3 rounded-full border border-border-app bg-white p-2 ps-5"
          >
            <MagicStar
              size={22}
              variant="Bold"
              color="currentColor"
              className="shrink-0 text-primary"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="למשל: דירת 3 חדרים עם מרפסת בתל אביב עד 8,000 ₪"
              className="min-w-0 flex-1 bg-transparent text-[16px] text-navy outline-none placeholder:text-[#9EB5C8]"
            />
            <button
              type="submit"
              disabled={searching}
              className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3 text-[15px] font-bold text-white transition hover:bg-primary-dark disabled:opacity-60"
            >
              <SearchNormal1 size={18} color="currentColor" />
              {searching ? "אתי מחפשת…" : "חיפוש AI"}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => runChip(chip)}
                className="cursor-pointer rounded-full border border-border-app bg-white px-4 py-2 text-[13px] font-semibold text-navy transition hover:border-primary hover:text-primary"
              >
                {chip}
              </button>
            ))}
          </div>

          {searching && (
            <div className="mx-auto mt-8 flex max-w-[680px] items-center gap-3 rounded-3xl border border-border-app bg-white p-5 text-start card-shadow">
              <MagicStar size={20} variant="Bold" color="currentColor" className="shrink-0 animate-pulse text-primary" />
              <span className="text-[14px] font-semibold text-secondary-text">
                אתי סורקת את הדירות הפעילות…
              </span>
            </div>
          )}

          {result && !searching && (
            <div className="mt-8 text-start">
              <div className="mx-auto max-w-[680px] rounded-3xl border border-border-app bg-white p-5 card-shadow">
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
                    className="shrink-0 text-secondary-text transition hover:text-coral"
                  >
                    <CloseCircle size={20} color="currentColor" />
                  </button>
                </div>
              </div>

              {result.listings.length > 0 && (
                <div className="no-scrollbar mt-4 flex snap-x gap-4 overflow-x-auto pb-2">
                  {result.listings.map((p) => (
                    <a key={p.id} href={`/listing/${p.id}`} className="block snap-start">
                      <PropertyCard property={p} />
                    </a>
                  ))}
                </div>
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

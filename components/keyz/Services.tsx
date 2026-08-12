"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MagicStar, Video, DocumentText, Map1, ArrowLeft2, ArrowRight2, type Icon } from "iconsax-react";

const SERVICES: { id: string; icon: Icon; title: string; desc: string; tag: string; bgGradient: string; iconBg: string }[] = [
  {
    id: "ai-staging",
    icon: MagicStar,
    title: "הדמיית AI",
    desc: "מעלים תמונה של חדר — ומקבלים הדמיה מעוצבת ומרוהטת תוך שניות",
    tag: "חדשנות AI",
    bgGradient: "from-blue-600 via-indigo-600 to-sky-500",
    iconBg: "bg-blue-50 text-[#0061FF]",
  },
  {
    id: "tour-360",
    icon: Video,
    title: "סיורי 360",
    desc: "מצלמים סיבוב אחד בטלפון ומקבלים סיור וירטואלי מקצועי לדירה",
    tag: "3D וירטואלי",
    bgGradient: "from-sky-500 via-blue-600 to-cyan-500",
    iconBg: "bg-sky-50 text-sky-600",
  },
  {
    id: "digital-contract",
    icon: DocumentText,
    title: "חוזה דיגיטלי",
    desc: "חוזה שכירות עם חתימה דיגיטלית מאובטחת — בלי הדפסות ובלי פגישות",
    tag: "מאובטח 100%",
    bgGradient: "from-[#072946] via-blue-900 to-indigo-900",
    iconBg: "bg-[#072946]/10 text-[#072946]",
  },
  {
    id: "neighborhood-intel",
    icon: Map1,
    title: "ניתוח שכונה",
    desc: "ציוני סביבה אמיתיים: חינוך, תחבורה, פארקים, רעש ומחירים באזור",
    tag: "נתוני לייב",
    bgGradient: "from-emerald-600 via-teal-600 to-sky-600",
    iconBg: "bg-emerald-50 text-emerald-600",
  },
];

export default function Services() {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextCard = () => {
    setActiveIndex((prev) => (prev + 1) % SERVICES.length);
  };

  const prevCard = () => {
    setActiveIndex((prev) => (prev - 1 + SERVICES.length) % SERVICES.length);
  };

  return (
    <section id="services" className="py-12 md:py-16 scroll-mt-24 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-50 text-[#0061FF] text-[12.5px] font-black mb-2">
              ✨ חוויית אפליקציה מתקדמת
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-navy tracking-tight">
              שירותים חכמים ב־Rently
            </h2>
            <p className="text-secondary-text mt-1 text-[14.5px] font-medium">
              כלים שהופכים חיפוש ופרסום דירה לחוויה אינטראקטיבית
            </p>
          </div>

          {/* Mobile swipe controls indicator */}
          <div className="flex sm:hidden items-center justify-between bg-slate-100/90 rounded-full p-1.5">
            <span className="text-[12px] font-bold text-slate-600 px-3">
              דפדף בין השירותים ({activeIndex + 1}/{SERVICES.length})
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={prevCard}
                aria-label="הקודם"
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-navy shadow-xs active:scale-95 transition"
              >
                <ArrowRight2 size={16} color="currentColor" />
              </button>
              <button
                type="button"
                onClick={nextCard}
                aria-label="הבא"
                className="w-8 h-8 rounded-full bg-[#0061FF] flex items-center justify-center text-white shadow-xs active:scale-95 transition"
              >
                <ArrowLeft2 size={16} color="currentColor" />
              </button>
            </div>
          </div>
        </div>

        {/* ── MOBILE PHYSICS CAROUSEL / DRAG STACK (sm:hidden) ── */}
        <div className="sm:hidden relative min-h-[290px] w-full flex justify-center items-center py-2">
          <div className="relative w-full max-w-[340px] h-[260px] flex items-center justify-center">
            {SERVICES.map((item, index) => {
              // Calculate offset relative to activeIndex
              const offset = (index - activeIndex + SERVICES.length) % SERVICES.length;
              const isFront = offset === 0;

              return (
                <motion.div
                  key={item.id}
                  drag={isFront ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.7}
                  onDragEnd={(_, info) => {
                    if (Math.abs(info.offset.x) > 60) {
                      if (info.offset.x < 0) nextCard();
                      else prevCard();
                    }
                  }}
                  animate={{
                    scale: 1 - offset * 0.06,
                    y: offset * 14,
                    zIndex: SERVICES.length - offset,
                    opacity: offset > 2 ? 0 : 1 - offset * 0.25,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 25,
                  }}
                  className={`absolute top-0 inset-x-0 mx-auto rounded-3xl p-6 bg-white border border-slate-200/90 shadow-[0_16px_35px_rgba(7,41,70,0.12)] cursor-grab active:cursor-grabbing select-none flex flex-col justify-between h-[250px] ${
                    isFront ? "ring-2 ring-blue-500/20" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl ${item.iconBg} flex items-center justify-center shadow-xs`}>
                        <item.icon size={26} variant="Bulk" color="currentColor" />
                      </div>
                      <span className="text-[11px] font-black px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                        {item.tag}
                      </span>
                    </div>

                    <h3 className="text-[20px] font-black text-navy mt-4">{item.title}</h3>
                    <p className="text-[14px] text-slate-600 mt-2 leading-relaxed font-medium">
                      {item.desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[12px] font-extrabold text-[#0061FF]">
                    <span>מחליק לפעולה ✨</span>
                    <span>←</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Dots pagination indicator for mobile */}
        <div className="flex sm:hidden justify-center gap-1.5 mt-4">
          {SERVICES.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              aria-label={`עבור לשירות ${idx + 1}`}
              onClick={() => setActiveIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                activeIndex === idx ? "w-7 bg-[#0061FF]" : "w-2 bg-slate-300"
              }`}
            />
          ))}
        </div>

        {/* ── DESKTOP GRID (hidden on mobile, visible sm+) ── */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-5">
          {SERVICES.map(({ icon: ServiceIcon, title, desc, tag, iconBg }) => (
            <motion.div
              key={title}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-white border border-slate-200/90 rounded-3xl p-6 hover:border-[#0061FF] transition-all shadow-xs hover:shadow-xl flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`w-[52px] h-[52px] rounded-2xl ${iconBg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <ServiceIcon size={28} variant="Bulk" color="currentColor" />
                  </div>
                  <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    {tag}
                  </span>
                </div>
                <h3 className="text-[18px] font-black text-navy mt-5 group-hover:text-[#0061FF] transition-colors">{title}</h3>
                <p className="text-[13.5px] text-slate-600 mt-2 leading-relaxed font-medium">
                  {desc}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[12.5px] font-extrabold text-slate-400 group-hover:text-[#0061FF] transition-colors">
                <span>למידע נוסף</span>
                <span className="transition-transform group-hover:translate-x-[-4px]">←</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

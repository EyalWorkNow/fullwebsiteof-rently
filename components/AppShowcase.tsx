"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/contexts/LanguageContext";

const tenantFiles  = ["tenant/swipe.png","tenant/grid.png","tenant/filters.png","tenant/map.png","tenant/property.png","tenant/matches.png","tenant/chat.png","tenant/profile.png"];
const landlordFiles = ["landlord/dashboard.png","landlord/analytics.png","landlord/activity.png","landlord/listings.png","landlord/listing.png","landlord/tenant-match.png","landlord/listing2.png","landlord/profile.png"];
const tenantColors  = ["#17BDB0","#6366F1","#F59E0B","#10B981","#FF6B7A","#EC4899","#0891B2","#8B5CF6"];
const landlordColors = ["#17BDB0","#6366F1","#F59E0B","#10B981","#FF6B7A","#EC4899","#8B5CF6","#0891B2"];

type Side = "tenant" | "landlord";

export default function AppShowcase() {
  const { t } = useTranslation();
  const [side, setSide] = useState<Side>("tenant");
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const files  = side === "tenant" ? tenantFiles  : landlordFiles;
  const colors = side === "tenant" ? tenantColors : landlordColors;
  const screens = side === "tenant" ? t.showcase.tenantScreens : t.showcase.landlordScreens;
  const cur = screens[active];
  const curColor = colors[active];

  const next = useCallback(() => setActive(i => (i + 1) % files.length), [files.length]);

  useEffect(() => { setActive(0); }, [side]);
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 3200);
    return () => clearInterval(timer);
  }, [paused, next]);

  return (
    <section id="showcase" className="py-28 px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #1A2B4A 0%, #0F1E38 55%, #1A3050 100%)" }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>

      <div className="absolute inset-0 dot-grid-dark pointer-events-none opacity-50" />

      <div className="max-w-6xl mx-auto relative z-10">

        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-5"
            style={{ background: "rgba(23,189,176,0.15)", border: "1px solid rgba(23,189,176,0.3)", color: "#5EEAD4" }}>
            {t.showcase.badge}
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">{t.showcase.h2}</h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">{t.showcase.sub}</p>
        </motion.div>

        {/* Side toggle */}
        <div className="flex justify-center mb-12">
          <div className="flex p-1.5 rounded-2xl gap-1"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {(["tenant", "landlord"] as const).map(s => (
              <motion.button key={s} onClick={() => setSide(s)}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all duration-200"
                style={{
                  background: side === s ? "white" : "transparent",
                  color: side === s ? "#1A2B4A" : "rgba(255,255,255,0.5)",
                  boxShadow: side === s ? "0 2px 12px rgba(0,0,0,0.15)" : "none",
                }}>
                {s === "tenant" ? t.showcase.tenantBtn : t.showcase.landlordBtn}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Phone */}
          <motion.div
            initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7 }}
            className="flex-shrink-0 relative">
            <motion.div
              className="absolute inset-0 rounded-full blur-3xl pointer-events-none -z-10"
              animate={{ background: `radial-gradient(circle, ${curColor}50 0%, transparent 65%)` }}
              transition={{ duration: 0.7 }}
              style={{ transform: "scale(0.75) translateY(10%)" }} />

            <motion.div
              animate={{ y: [0, -10, 0] }} transition={{ duration: 4.5, ease: "easeInOut", repeat: Infinity }}
              className="relative mx-auto phone-shadow"
              style={{ width: 272, background: "#111827", borderRadius: 48, padding: 12 }}>
              <div className="absolute z-10 top-3 left-1/2 -translate-x-1/2"
                style={{ width: 88, height: 26, background: "#111827", borderRadius: "0 0 16px 16px" }} />
              <div style={{ borderRadius: 38, overflow: "hidden", minHeight: 410 }}>
                <AnimatePresence mode="wait">
                  <motion.div key={`${side}-${files[active]}`}
                    initial={{ opacity: 0, y: 14, scale: 1.03 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ duration: 0.38, ease: "easeInOut" }}>
                    <Image src={`/screenshots/${files[active]}`} alt={cur.title}
                      width={248} height={537} className="w-full block" style={{ objectFit: "cover" }} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            <div className="flex justify-center gap-2 mt-5">
              {files.map((_, i) => (
                <motion.button key={i} onClick={() => setActive(i)}
                  animate={{ width: active === i ? 22 : 6, background: active === i ? curColor : "rgba(255,255,255,0.2)" }}
                  transition={{ duration: 0.3 }} style={{ height: 6, borderRadius: 99 }}
                  className="cursor-pointer" aria-label={`screen ${i + 1}`} />
              ))}
            </div>
          </motion.div>

          {/* Info + thumbs */}
          <div className="flex-1 w-full">
            <AnimatePresence mode="wait">
              <motion.div key={`${side}-${active}`}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl p-7 mb-6"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold mb-3"
                  style={{ background: `${curColor}22`, color: curColor }}>
                  {String(active + 1).padStart(2, "0")} / {String(files.length).padStart(2, "0")} •{" "}
                  {side === "tenant" ? t.showcase.tenantLabel : t.showcase.landlordLabel}
                </div>
                <h3 className="text-2xl font-black text-white mb-2">{cur.title}</h3>
                <p className="text-slate-300 leading-relaxed">{cur.desc}</p>
              </motion.div>
            </AnimatePresence>

            <div className="grid grid-cols-4 gap-2">
              {files.map((f, i) => (
                <motion.button key={`${side}-${f}`} onClick={() => setActive(i)}
                  whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className="relative rounded-xl overflow-hidden cursor-pointer focus:outline-none"
                  style={{
                    opacity: active === i ? 1 : 0.38,
                    outline: active === i ? `2.5px solid ${colors[i]}` : "2.5px solid transparent",
                    outlineOffset: 2, transition: "opacity 0.25s",
                  }}
                  aria-label={screens[i].title}>
                  <Image src={`/screenshots/${f}`} alt={screens[i].title}
                    width={80} height={140} className="w-full block" style={{ background: "#111827" }} />
                  {active === i && <div className="absolute inset-0 pointer-events-none" style={{ background: `${colors[i]}20` }} />}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

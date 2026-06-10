"use client";
import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChartSquare, Home2, Messages2, ShieldTick, Moneys, ArrowRight2 } from "iconsax-react";
import WaitlistForm from "./WaitlistForm";
import { useTranslation } from "@/contexts/LanguageContext";

const perkIcons = [ChartSquare, Home2, Messages2, ShieldTick, Moneys];
const perkColors = ["#17BDB0", "#6366F1", "#FF6B7A", "#10B981", "#F59E0B"];
const screenColors = ["#17BDB0", "#6366F1", "#F59E0B", "#10B981"];
const screenFiles  = ["landlord/dashboard.png", "landlord/analytics.png", "landlord/listings.png", "landlord/tenant-match.png"];

export default function ForLandlords() {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const cur = t.landlords.screens[active];

  return (
    <section id="landlords" className="py-28 px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0F1E38 0%, #1A2B4A 55%, #0F2A3D 100%)" }}>

      <div className="absolute inset-0 dot-grid-dark pointer-events-none opacity-40" />
      <div className="absolute -top-24 -right-24 w-[600px] h-[600px] rounded-full pointer-events-none animate-blob"
        style={{ background: "radial-gradient(circle, rgba(23,189,176,0.14) 0%, transparent 65%)" }} />
      <div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] rounded-full pointer-events-none animate-blob-delayed"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)" }} />

      <div className="max-w-6xl mx-auto relative z-10">

        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-5"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#A5B4FC" }}>
            {t.landlords.badge}
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
            {t.landlords.h2a}<br />
            <span style={{ color: "#17BDB0" }}>{t.landlords.h2b}</span>
          </h2>
          <p className="text-slate-300 text-lg max-w-xl mx-auto">{t.landlords.sub}</p>
        </motion.div>

        <div className="flex flex-col xl:flex-row gap-12 xl:gap-16 items-start">

          {/* Left: phone + tabs */}
          <motion.div
            initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7 }}
            className="flex-1 xl:max-w-md w-full">

            <div className="grid grid-cols-2 gap-2 mb-6">
              {t.landlords.screens.map((sc, i) => (
                <motion.button key={i} onClick={() => setActive(i)}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 380, damping: 22 }}
                  className="rounded-xl px-3 py-2.5 text-start cursor-pointer transition-all duration-200"
                  style={{
                    background: active === i ? `${screenColors[i]}18` : "rgba(255,255,255,0.05)",
                    border: `1.5px solid ${active === i ? screenColors[i] + "50" : "rgba(255,255,255,0.08)"}`,
                  }}>
                  <div className="text-xs font-bold mb-0.5" style={{ color: active === i ? screenColors[i] : "rgba(255,255,255,0.55)" }}>
                    {sc.title}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-tight line-clamp-1">{sc.desc}</div>
                </motion.button>
              ))}
            </div>

            <div className="relative mx-auto" style={{ width: 260 }}>
              <motion.div
                className="absolute inset-0 rounded-full blur-3xl pointer-events-none -z-10"
                animate={{ background: `radial-gradient(circle, ${screenColors[active]}45 0%, transparent 65%)` }}
                transition={{ duration: 0.7 }}
                style={{ transform: "scale(0.8) translateY(12%)" }} />

              <AnimatePresence mode="wait">
                <motion.div key={active}
                  initial={{ opacity: 0, x: 20, scale: 0.85 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -10, scale: 0.9 }}
                  transition={{ duration: 0.35, type: "spring", stiffness: 300, damping: 22 }}
                  className="absolute z-20 -end-10 top-16 glass rounded-2xl px-4 py-2.5 shadow-xl"
                  style={{ border: `1.5px solid ${screenColors[active]}30`, minWidth: 110 }}>
                  <div className="text-lg font-black" style={{ color: screenColors[active] }}>{cur.stat}</div>
                  <div className="text-[10px] text-slate-500">{cur.statLabel}</div>
                </motion.div>
              </AnimatePresence>

              <motion.div
                animate={{ y: [0, -8, 0] }} transition={{ duration: 5, ease: "easeInOut", repeat: Infinity }}
                className="phone-shadow"
                style={{ width: 248, background: "#111827", borderRadius: 44, padding: 10, margin: "0 auto" }}>
                <div className="absolute z-10 top-2.5 left-1/2 -translate-x-1/2"
                  style={{ width: 80, height: 22, background: "#111827", borderRadius: "0 0 12px 12px" }} />
                <div style={{ borderRadius: 36, overflow: "hidden", minHeight: 390 }}>
                  <AnimatePresence mode="wait">
                    <motion.div key={screenFiles[active]}
                      initial={{ opacity: 0, y: 12, scale: 1.03 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.97 }}
                      transition={{ duration: 0.38, ease: "easeInOut" }}>
                      <Image src={`/screenshots/${screenFiles[active]}`} alt={cur.title}
                        width={228} height={494} className="w-full block" style={{ objectFit: "cover" }} />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {t.landlords.perks.map((label, i) => {
                const Icon = perkIcons[i];
                return (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: `${perkColors[i]}14`, color: perkColors[i], border: `1px solid ${perkColors[i]}30` }}>
                    <Icon size={12} color={perkColors[i]} variant="Bold" />
                    {label}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Right: form card */}
          <motion.div
            initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }}
            className="flex-1 xl:max-w-md w-full">

            <div className="rounded-3xl p-8"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(20px)" }}>

              <div className="rounded-2xl p-5 mb-7"
                style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <p className="text-slate-200 text-sm leading-relaxed mb-4">
                  &quot;{t.landlords.testimonial.quote}&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{ background: "rgba(99,102,241,0.25)", color: "#A5B4FC" }}>
                    {t.landlords.testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold">{t.landlords.testimonial.name}</p>
                    <p className="text-slate-400 text-[11px]">{t.landlords.testimonial.role}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-black text-white mb-1">{t.landlords.formTitle}</h3>
                <p className="text-slate-300 text-sm">{t.landlords.formSub}</p>
              </div>

              <WaitlistForm source="landlord-section" defaultRole="landlord" darkMode compact />

              <div className="flex items-center gap-3 mt-5 pt-5 border-t border-white/8">
                <ArrowRight2 size={14} color="#5EEAD4" />
                <p className="text-xs text-slate-400">{t.landlords.trust}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

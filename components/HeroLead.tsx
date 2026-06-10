"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Flash, ShieldTick, Star1, Timer1 } from "iconsax-react";
import WaitlistForm from "./WaitlistForm";
import { useTranslation } from "@/contexts/LanguageContext";

const trustItems = [
  { icon: ShieldTick, color: "#17BDB0", textKey: "t1" },
  { icon: Star1,      color: "#F59E0B", textKey: "t2" },
  { icon: Timer1,     color: "#6366F1", textKey: "t3" },
];

export default function HeroLead() {
  const { t } = useTranslation();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const cardY = useTransform(scrollYProgress, [0,1], [40, -40]);

  return (
    <section id="herolead" ref={ref} className="relative py-24 px-4 overflow-hidden">

      {/* Subtle gradient bridge from hero */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(234,249,248,0.9) 0%, #fff 60%)" }} />
      <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />

      {/* Background blobs */}
      <div className="absolute -top-20 right-0 w-[500px] h-[500px] rounded-full pointer-events-none opacity-40 animate-blob"
        style={{ background: "radial-gradient(circle, rgba(23,189,176,0.18) 0%, transparent 65%)" }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none opacity-30 animate-blob-delayed"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 65%)" }} />

      <div className="max-w-5xl mx-auto relative z-10">

        {/* Section header */}
        <motion.div className="text-center mb-12"
          initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.65, ease: [0.22,1,0.36,1] as [number,number,number,number] }}>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} transition={{ delay: 0.08, type: "spring", stiffness: 220 }}
            className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full text-sm font-bold"
            style={{ background: "rgba(23,189,176,0.1)", border: "1px solid rgba(23,189,176,0.28)", color: "#0F8A80" }}>
            <Flash size={13} color="#17BDB0" variant="Bold" />
            {t.hero.badge}
          </motion.div>

          <h2 className="text-3xl md:text-5xl font-black text-[#1A2B4A] leading-tight mb-4">
            {t.download.formTitle}
          </h2>
          <p className="text-lg text-slate-500 max-w-md mx-auto">{t.download.formSub}</p>
        </motion.div>

        {/* Main card + social proof side by side on desktop */}
        <div className="flex flex-col lg:flex-row items-stretch gap-8 max-w-4xl mx-auto">

          {/* Form card */}
          <motion.div
            style={{ y: cardY, background: "white", border: "1.5px solid rgba(23,189,176,0.2)", boxShadow: "0 20px 60px rgba(23,189,176,0.12), 0 4px 20px rgba(0,0,0,0.05)" }}
            className="flex-1 rounded-3xl p-8 relative overflow-hidden"
            initial={{ opacity: 0, y: 32, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22,1,0.36,1] as [number,number,number,number] }}>

            {/* Glow accent */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none opacity-40"
              style={{ background: "radial-gradient(circle, rgba(23,189,176,0.3) 0%, transparent 70%)" }} />

            <WaitlistForm source="hero-lead" defaultRole="tenant" compact={false} />
          </motion.div>

          {/* Social proof column */}
          <motion.div
            className="lg:w-64 flex flex-col gap-5 justify-center"
            initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.65, delay: 0.18, ease: [0.22,1,0.36,1] as [number,number,number,number] }}>

            {/* Stat cards */}
            {[
              { value: "2,800+", label: t.download.t2, color: "#17BDB0", bg: "rgba(23,189,176,0.07)" },
              { value: "4.8★",   label: t.download.t1.replace("4.8 ",""), color: "#F59E0B", bg: "rgba(245,158,11,0.07)" },
              { value: "148",    label: t.download.t3.replace("148 ",""), color: "#6366F1", bg: "rgba(99,102,241,0.07)" },
            ].map((s, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.25 + i*0.1, duration: 0.5, ease: [0.22,1,0.36,1] as [number,number,number,number] }}
                whileHover={{ scale: 1.04, y: -3 }}
                className="rounded-2xl px-5 py-4 cursor-default"
                style={{ background: s.bg, border: `1px solid ${s.color}22` }}>
                <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </motion.div>
            ))}

            {/* Trust badges */}
            <div className="space-y-2.5 mt-1">
              {trustItems.map(({ icon: Icon, color, textKey }, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.55 + i*0.08, duration: 0.4 }}
                  className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}15` }}>
                    <Icon size={14} color={color} variant="Bold" />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {textKey === "t1" && t.hero.trust}
                    {textKey === "t2" && t.download.t1}
                    {textKey === "t3" && t.download.t3}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
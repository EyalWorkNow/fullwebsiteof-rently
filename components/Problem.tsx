"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { CloseCircle, Warning2, Timer1 } from "iconsax-react";
import { useTranslation } from "@/contexts/LanguageContext";

const icons   = [CloseCircle, Warning2, Timer1];
const colors  = ["#FF6B7A", "#F59E0B", "#8B5CF6"];
const bgs     = ["rgba(255,107,122,0.1)", "rgba(245,158,11,0.1)", "rgba(139,92,246,0.1)"];

export default function Problem() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="problem" ref={ref} className="py-28 px-4 relative overflow-hidden"
      style={{ background: "#0B1428" }}>

      <div className="absolute inset-0 dot-grid-dark pointer-events-none opacity-60" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,107,122,0.6) 0%, transparent 65%)", transform: "translate(30%,-40%)", opacity: 0.06 }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.8) 0%, transparent 65%)", transform: "translate(-30%,40%)", opacity: 0.05 }} />

      <div className="max-w-5xl mx-auto relative z-10">

        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65 }}
          className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-5"
            style={{ background: "rgba(255,107,122,0.12)", border: "1px solid rgba(255,107,122,0.25)", color: "#FF9AA5" }}>
            {t.problem.badge}
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            {t.problem.h2a}<br />
            <span style={{ color: "#FF6B7A" }}>{t.problem.h2b}</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">{t.problem.sub}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {t.problem.pains.map((p, i) => {
            const Icon = icons[i];
            return (
              <motion.div key={p.title}
                initial={{ opacity: 0, y: 32 }} animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.14, ease: "easeOut" }}
                whileHover={{ y: -5 }}
                className="rounded-2xl p-7 cursor-default relative overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: bgs[i] }}>
                  <Icon size={22} color={colors[i]} variant="Bold" />
                </div>
                <div className="mb-4">
                  <span className="text-4xl font-black leading-none" style={{ color: colors[i] }}>{p.stat}</span>
                  <span className="text-slate-400 text-sm font-medium ms-2">{p.statLabel}</span>
                </div>
                <h3 className="text-base font-bold text-white mb-3">{p.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{p.body}</p>
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-tr-2xl pointer-events-none opacity-10"
                  style={{ background: `radial-gradient(circle at 0% 100%, ${colors[i]} 0%, transparent 70%)` }} />
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="text-center mt-14">
          <div className="inline-flex flex-col items-center gap-2">
            <p className="text-slate-500 text-sm font-medium">{t.problem.outro}</p>
            <div className="w-px h-10 rounded-full" style={{ background: "linear-gradient(to bottom, transparent, rgba(23,189,176,0.6))" }} />
            <div className="w-3 h-3 rounded-full relative">
              <span className="absolute inset-0 rounded-full animate-pulse-ring" style={{ background: "rgba(23,189,176,0.4)" }} />
              <span className="relative w-full h-full rounded-full block" style={{ background: "#17BDB0" }} />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

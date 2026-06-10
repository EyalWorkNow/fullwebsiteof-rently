"use client";
import { motion } from "framer-motion";
import { Home2, Building, People } from "iconsax-react";
import { useTranslation } from "@/contexts/LanguageContext";

const icons    = [Home2, Building, People];
const colors   = ["#17BDB0", "#6366F1", "#FF6B7A"];
const gradients= ["linear-gradient(135deg, #E0F7F5 0%, #F0FFFE 100%)", "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)", "linear-gradient(135deg, #FFE8EA 0%, #FFF0F1 100%)"];
const borders  = ["rgba(23,189,176,0.2)", "rgba(99,102,241,0.2)", "rgba(255,107,122,0.2)"];
const shadows  = ["rgba(23,189,176,0.12)", "rgba(99,102,241,0.12)", "rgba(255,107,122,0.12)"];
const featured = [false, true, false];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const item = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } } };

export default function Audiences() {
  const { t } = useTranslation();

  return (
    <section id="audiences" className="py-28 px-4 bg-white">
      <div className="max-w-6xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-5"
            style={{ background: "rgba(23,189,176,0.1)", border: "1px solid rgba(23,189,176,0.25)", color: "#0F8A80" }}>
            {t.audiences.badge}
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-[#1A2B4A] mb-4">{t.audiences.h2}</h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">{t.audiences.sub}</p>
        </motion.div>

        <motion.div
          variants={container} initial="hidden" whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.audiences.cards.map((card, i) => {
            const Icon = icons[i];
            return (
              <motion.div key={i} variants={item}
                whileHover={{ y: -8, boxShadow: `0 28px 64px ${shadows[i]}` }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className="rounded-3xl p-8 cursor-default relative overflow-hidden"
                style={{ background: gradients[i], border: `1.5px solid ${borders[i]}`, boxShadow: featured[i] ? `0 16px 48px ${shadows[i]}` : "none" }}>

                {featured[i] && (
                  <div className="absolute top-5 end-5 px-3 py-1 rounded-full text-[10px] font-black text-white"
                    style={{ background: colors[i] }}>
                    {t.audiences.featured}
                  </div>
                )}

                <motion.div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: `${colors[i]}18`, border: `1px solid ${colors[i]}30` }}
                  whileHover={{ rotate: 6, scale: 1.1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}>
                  <Icon size={28} color={colors[i]} variant="Bold" />
                </motion.div>

                <h3 className="text-xl font-black text-[#1A2B4A] mb-1">{card.title}</h3>
                <p className="text-sm font-semibold mb-5" style={{ color: colors[i] }}>{card.tagline}</p>

                <ul className="space-y-2.5 mb-7">
                  {card.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `${colors[i]}20` }}>
                        <span className="w-1.5 h-1.5 rounded-full block" style={{ background: colors[i] }} />
                      </span>
                      <span className="text-sm text-slate-600 leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>

                <motion.a href="#download"
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm cursor-pointer text-white"
                  style={{ background: colors[i], boxShadow: `0 6px 18px ${colors[i]}35` }}>
                  {t.audiences.cta}
                </motion.a>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

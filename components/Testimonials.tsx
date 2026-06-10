"use client";
import { motion } from "framer-motion";
import { Star1, QuoteUp } from "iconsax-react";
import { useTranslation } from "@/contexts/LanguageContext";

const colors = ["#17BDB0", "#8B5CF6", "#FF6B7A", "#F59E0B"];
const bgs    = ["#E0F7F5", "#EDE9FE", "#FFE8EA", "#FEF3C7"];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const card = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } } };

export default function Testimonials() {
  const { t } = useTranslation();

  return (
    <section className="py-28 px-4" style={{ background: "linear-gradient(180deg, #fff 0%, #F5FFFE 100%)" }}>
      <div className="max-w-6xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-5"
            style={{ background: "rgba(23,189,176,0.1)", border: "1px solid rgba(23,189,176,0.25)", color: "#0F8A80" }}>
            {t.testimonials.badge}
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-[#1A2B4A] mb-4">{t.testimonials.h2}</h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">{t.testimonials.sub}</p>
        </motion.div>

        <motion.div
          variants={container} initial="hidden" whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {t.testimonials.reviews.map((r, i) => (
            <motion.div key={i} variants={card}
              whileHover={{ y: -5, boxShadow: `0 24px 56px ${colors[i]}18, 0 4px 12px rgba(0,0,0,0.06)` }}
              transition={{ type: "spring", stiffness: 340, damping: 22 }}
              className="rounded-2xl p-7 cursor-default relative overflow-hidden"
              style={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>

              <div className="absolute top-5 end-5 opacity-[0.06]">
                <QuoteUp size={48} color={colors[i]} variant="Bold" />
              </div>

              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <motion.div key={j}
                    initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                    transition={{ delay: 0.1 + j * 0.06, type: "spring", stiffness: 300, damping: 15 }}>
                    <Star1 size={16} color="#F59E0B" variant="Bold" />
                  </motion.div>
                ))}
              </div>

              <p className="text-[#334155] leading-relaxed mb-6 text-sm relative z-10">&ldquo;{r.text}&rdquo;</p>

              <div className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                  style={{ background: bgs[i], color: colors[i] }}
                  whileHover={{ scale: 1.1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                  {r.avatar}
                </motion.div>
                <div>
                  <p className="text-sm font-bold text-[#1A2B4A]">{r.name}</p>
                  <p className="text-xs text-slate-400">{r.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

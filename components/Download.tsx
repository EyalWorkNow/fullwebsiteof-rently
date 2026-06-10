"use client";
import { motion } from "framer-motion";
import { Apple, Google, Star1 } from "iconsax-react";
import { useTranslation } from "@/contexts/LanguageContext";

export default function Download() {
  const { t } = useTranslation();

  return (
    <section id="download" className="py-28 px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0B1428 0%, #1A2B4A 50%, #0F2A3D 100%)" }}>

      <div className="absolute inset-0 dot-grid-dark pointer-events-none opacity-50" />
      <div className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full pointer-events-none animate-blob"
        style={{ background: "radial-gradient(circle, rgba(23,189,176,0.2) 0%, transparent 65%)" }} />
      <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full pointer-events-none animate-blob-delayed"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 65%)" }} />

      <div className="max-w-5xl mx-auto relative z-10">

        <motion.div
          initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.7 }}
          className="text-center mb-14">

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6"
            style={{ background: "rgba(23,189,176,0.12)", border: "1px solid rgba(23,189,176,0.3)", color: "#5EEAD4" }}>
            {t.download.badge}
          </div>

          <h2 className="text-4xl md:text-6xl font-black text-white leading-tight mb-5">
            {t.download.h2a}<br />
            <span className="gradient-text">{t.download.h2b}</span>
          </h2>

          <p className="text-slate-300 text-xl leading-relaxed mb-10 max-w-lg mx-auto">{t.download.sub}</p>

          <div className="flex flex-wrap gap-4 justify-center mb-8">
            <StoreBtn icon={<Apple size={24} color="#fff" variant="Bold" />} sub={t.download.s1sub} main={t.download.s1} />
            <StoreBtn icon={<Google size={24} color="#1A2B4A" variant="Bold" />} sub={t.download.s2sub} main={t.download.s2} light />
          </div>

          <div className="flex items-center justify-center gap-6 flex-wrap mb-16">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[0,1,2,3,4].map(i => <Star1 key={i} size={14} color="#F59E0B" variant="Bold" />)}
              </div>
              <span className="text-sm font-bold text-white">4.8</span>
              <span className="text-sm text-slate-400">{t.download.t1.replace("4.8 ", "")}</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <p className="text-sm text-slate-400"><strong className="text-white">+500</strong> {t.download.t2.replace("+500 ", "")}</p>
            <div className="w-px h-4 bg-white/10" />
            <p className="text-sm text-slate-400"><strong className="text-white">148</strong> {t.download.t3.replace("148 ", "")}</p>
          </div>
        </motion.div>

      </div>
    </section>
  );
}

function StoreBtn({ icon, sub, main, light }: { icon: React.ReactNode; sub: string; main: string; light?: boolean }) {
  return (
    <motion.a href="#"
      whileHover={{ y: -4, scale: 1.04 }} whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      className={`relative inline-flex items-center gap-3 px-7 py-4 rounded-2xl font-bold text-sm cursor-pointer overflow-hidden ${light ? "bg-white text-[#1A2B4A] shadow-lg" : "text-white"}`}
      style={!light ? { background: "linear-gradient(135deg, #17BDB0, #0F8A80)", boxShadow: "0 12px 32px rgba(23,189,176,0.35)" } : {}}>
      {!light && <span className="absolute inset-0 shimmer-bg opacity-30 pointer-events-none" />}
      <span className="relative">{icon}</span>
      <div className="leading-tight relative">
        <div className="text-[10px] font-normal opacity-60">{sub}</div>
        <div className="text-base">{main}</div>
      </div>
    </motion.a>
  );
}

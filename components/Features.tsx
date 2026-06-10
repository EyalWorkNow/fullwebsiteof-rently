"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Heart, Location, Messages2, Filter,
  ShieldTick, Scan, Star1, PercentageSquare,
} from "iconsax-react";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };
const card = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } } };

export default function Features() {
  return (
    <section id="features" className="py-28 px-4 bg-white">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-5"
            style={{ background: "rgba(23,189,176,0.1)", border: "1px solid rgba(23,189,176,0.25)", color: "#0F8A80" }}>
            מה תמצאו ב-Rently
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-[#1A2B4A] mb-4">
            כל מה שחסר בחיפוש דירות<br />
            <span className="gradient-text">כבר קיים פה</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            אחד המוצרים הכי מלאים לחיפוש דירה שנבנה בישראל
          </p>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          variants={container} initial="hidden" whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">

          {/* BIG: Swipe */}
          <motion.div variants={card}
            whileHover={{ y: -5, boxShadow: "0 24px 56px rgba(255,107,122,0.16)" }}
            transition={{ type: "spring", stiffness: 340, damping: 24 }}
            className="sm:col-span-2 lg:col-span-2 rounded-3xl overflow-hidden relative cursor-default group"
            style={{ minHeight: 300, background: "linear-gradient(135deg, #FFE8EA 0%, #FFF0F1 100%)", border: "1px solid rgba(255,107,122,0.15)" }}>
            <div className="p-7 relative z-10">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(255,107,122,0.15)" }}>
                <Heart size={24} color="#FF6B7A" variant="Bold" />
              </div>
              <h3 className="text-xl font-black text-[#1A2B4A] mb-2">גלוש ותחליק</h3>
              <p className="text-slate-500 text-sm leading-relaxed max-w-sm">
                מחליקים ימינה לאהוב, שמאלה לדחות — בדיוק כמו שאתם מכירים. כל כרטיסייה מציגה תמונות, מחיר, מיקום ואחוז ההתאמה האישי שלכם לדירה.
              </p>
            </div>
            {/* Screenshot preview */}
            <div className="absolute bottom-0 left-5 opacity-90 pointer-events-none group-hover:scale-105 transition-transform duration-500 origin-bottom">
              <div className="relative phone-shadow" style={{ width: 120, borderRadius: 22, overflow: "hidden", background: "#111827", padding: 5 }}>
                <Image src="/screenshots/swipe.png" alt="Swipe" width={110} height={238} className="w-full block rounded-[16px]" />
              </div>
            </div>
          </motion.div>

          {/* Match % */}
          <motion.div variants={card}
            whileHover={{ y: -5, boxShadow: "0 24px 56px rgba(23,189,176,0.14)" }}
            className="rounded-3xl p-7 cursor-default"
            style={{ background: "linear-gradient(135deg, #E0F7F5 0%, #F0FFFE 100%)", border: "1px solid rgba(23,189,176,0.15)" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(23,189,176,0.15)" }}>
              <PercentageSquare size={24} color="#17BDB0" variant="Bold" />
            </div>
            <h3 className="text-lg font-black text-[#1A2B4A] mb-2">אחוז התאמה אישי</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              אלגוריתם שמחשב כמה כל דירה מתאימה לכם לפי ההעדפות והסינונים שלכם.
            </p>
          </motion.div>

          {/* Verified */}
          <motion.div variants={card}
            whileHover={{ y: -5, boxShadow: "0 24px 56px rgba(16,185,129,0.14)" }}
            className="rounded-3xl p-7 cursor-default"
            style={{ background: "linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)", border: "1px solid rgba(16,185,129,0.15)" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(16,185,129,0.15)" }}>
              <ShieldTick size={24} color="#10B981" variant="Bold" />
            </div>
            <h3 className="text-lg font-black text-[#1A2B4A] mb-2">מודעות מאומתות</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              בעלי דירה מאמתים עם וידאו — אין הפתעות, אין פרסומים כוזבים, רק מציאות.
            </p>
          </motion.div>

          {/* 3D */}
          <motion.div variants={card}
            whileHover={{ y: -5, boxShadow: "0 24px 56px rgba(139,92,246,0.14)" }}
            className="rounded-3xl p-7 cursor-default"
            style={{ background: "linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)", border: "1px solid rgba(139,92,246,0.15)" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(139,92,246,0.15)" }}>
              <Scan size={24} color="#8B5CF6" variant="Bold" />
            </div>
            <h3 className="text-lg font-black text-[#1A2B4A] mb-2">סיורים 3D</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              סיורים וירטואליים ו-AI Walkthrough — רואים כל חדר בלי לצאת מהבית.
            </p>
          </motion.div>

          {/* Map */}
          <motion.div variants={card}
            whileHover={{ y: -5, boxShadow: "0 24px 56px rgba(99,102,241,0.14)" }}
            className="rounded-3xl overflow-hidden relative cursor-default group"
            style={{ minHeight: 220, background: "linear-gradient(135deg, #EEF2FF 0%, #F0F1FF 100%)", border: "1px solid rgba(99,102,241,0.15)" }}>
            <div className="p-7 relative z-10">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(99,102,241,0.15)" }}>
                <Location size={24} color="#6366F1" variant="Bold" />
              </div>
              <h3 className="text-lg font-black text-[#1A2B4A] mb-2">מפה חיה</h3>
              <p className="text-sm text-slate-500 leading-relaxed">חיפוש על מפה עם פינים חכמים ופרטים בלחיצה.</p>
            </div>
            <div className="absolute bottom-0 left-4 opacity-80 pointer-events-none group-hover:scale-105 transition-transform duration-500 origin-bottom">
              <div className="relative" style={{ width: 100, borderRadius: 18, overflow: "hidden", background: "#111827", padding: 4 }}>
                <Image src="/screenshots/map.png" alt="Map" width={92} height={200} className="w-full block rounded-[12px]" />
              </div>
            </div>
          </motion.div>

          {/* Filters + Chat row */}
          <motion.div variants={card}
            whileHover={{ y: -5, boxShadow: "0 24px 56px rgba(245,158,11,0.14)" }}
            className="rounded-3xl p-7 cursor-default"
            style={{ background: "linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(245,158,11,0.15)" }}>
              <Filter size={24} color="#F59E0B" variant="Bold" />
            </div>
            <h3 className="text-lg font-black text-[#1A2B4A] mb-2">פילטרים חכמים</h3>
            <p className="text-sm text-slate-500 leading-relaxed">מגדירים פעם אחת — מקבלים רק מה שמתאים.</p>
          </motion.div>

          <motion.div variants={card}
            whileHover={{ y: -5, boxShadow: "0 24px 56px rgba(8,145,178,0.14)" }}
            className="rounded-3xl p-7 cursor-default"
            style={{ background: "linear-gradient(135deg, #E0F2FE 0%, #F0F9FF 100%)", border: "1px solid rgba(8,145,178,0.15)" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(8,145,178,0.15)" }}>
              <Messages2 size={24} color="#0891B2" variant="Bold" />
            </div>
            <h3 className="text-lg font-black text-[#1A2B4A] mb-2">צ׳אט ישיר</h3>
            <p className="text-sm text-slate-500 leading-relaxed">שיחה ישירה עם בעל הדירה — בלי מתווכים, בלי עמלות.</p>
          </motion.div>

          {/* AI Staging */}
          <motion.div variants={card}
            whileHover={{ y: -5, boxShadow: "0 24px 56px rgba(236,72,153,0.14)" }}
            className="rounded-3xl p-7 cursor-default"
            style={{ background: "linear-gradient(135deg, #FCE7F3 0%, #FDF2F8 100%)", border: "1px solid rgba(236,72,153,0.15)" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(236,72,153,0.15)" }}>
              <Star1 size={24} color="#EC4899" variant="Bold" />
            </div>
            <h3 className="text-lg font-black text-[#1A2B4A] mb-2">הדמיות AI</h3>
            <p className="text-sm text-slate-500 leading-relaxed">AI מצייר את הדירה הריקה עם ריהוט — בשניות.</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

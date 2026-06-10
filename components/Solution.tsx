"use client";
import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Category2, ShieldTick, Scan } from "iconsax-react";

const tabs = [
  {
    id: "swipe",
    icon: Heart,
    label: "Swipe",
    title: "דפדוף בדירות כמו שאתה מכיר",
    body: "חוויית הסוויפ שלנו מבוססת על הרגלי הגלישה שלכם. כל כרטיסייה מציגה את כל המידע החשוב — תמונות, מחיר, מיקום ואחוז ההתאמה האישי שלכם.",
    bullets: ["מחליקים ימינה = אוהבים, שמאלה = דוחים", "רואים את אחוז ההתאמה בכל כרטיסייה", "תמונות מאומתות בלבד"],
    screen: "swipe.png",
    color: "#FF6B7A",
    bg: "#FFE8EA",
  },
  {
    id: "grid",
    icon: Category2,
    label: "Grid",
    title: "תצוגת גריד למי שמעדיף",
    body: "לא אוהבים סוויפים? אין בעיה. תצוגת הגריד מציגה את כל הדירות בתצוגה מסורתית יותר — עם כל הפילטרים החכמים שלנו.",
    bullets: ["מיון וסינון מלאים", "השוואה בין דירות", "תצוגה גמישה לפי העדפה"],
    screen: "grid.png",
    color: "#6366F1",
    bg: "#EEF2FF",
  },
  {
    id: "verify",
    icon: ShieldTick,
    label: "אימות",
    title: "אמון שנבנה מהיסוד",
    body: "כל מודעה עוברת תהליך אימות: בעל הדירה מצלם וידאו קצר, מאמת תמונות, ומזדהה. אין הפתעות, אין מודעות כוזבות.",
    bullets: ["אימות זהות בעל הדירה", "תמונות ממשיות מאומתות", "תג ״מאומת״ על כל מודעה שעברה בדיקה"],
    screen: "property.png",
    color: "#10B981",
    bg: "#D1FAE5",
  },
  {
    id: "tour",
    icon: Scan,
    label: "3D Tour",
    title: "סיור וירטואלי לפני שמגיעים",
    body: "עם טכנולוגיית הסריקה שלנו, בעלי דירות מצלמים את הדירה בנייד ואנחנו בונים מודל תלת-ממדי מלא שאפשר לסייר בו מהסמארטפון.",
    bullets: ["מודל 3D מלא של הדירה", "הדמיות AI עם ריהוט", "חוסך נסיעות לדירות לא מתאימות"],
    screen: "property2.png",
    color: "#8B5CF6",
    bg: "#EDE9FE",
  },
];

export default function Solution() {
  const [active, setActive] = useState(0);
  const current = tabs[active];

  return (
    <section id="solution" className="py-28 px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #1A2B4A 0%, #0F1E3A 50%, #1A3050 100%)" }}>

      <div className="absolute inset-0 dot-grid-dark pointer-events-none opacity-50" />

      <div className="max-w-6xl mx-auto relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-5"
            style={{ background: "rgba(23,189,176,0.15)", border: "1px solid rgba(23,189,176,0.3)", color: "#5EEAD4" }}>
            הפתרון
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Rently = Swipe + Grid +<br />
            <span style={{ color: "#17BDB0" }}>אימות + AI Tour</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            ארבעה כלים שלא קיימים ביחד בשום מקום אחר
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex justify-center flex-wrap gap-2 mb-12">
          {tabs.map((t, i) => {
            const Icon = t.icon;
            const isActive = active === i;
            return (
              <motion.button
                key={t.id}
                onClick={() => setActive(i)}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all duration-200"
                style={{
                  background: isActive ? t.color : "rgba(255,255,255,0.07)",
                  color: isActive ? "white" : "rgba(255,255,255,0.55)",
                  border: isActive ? "none" : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: isActive ? `0 8px 24px ${t.color}40` : "none",
                }}>
                <Icon size={16} color={isActive ? "white" : t.color} variant="Bold" />
                {t.label}
              </motion.button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Phone */}
          <motion.div
            initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7 }}
            className="flex-shrink-0 relative">
            <div className="absolute inset-0 blur-3xl opacity-25 -z-10"
              style={{ background: `radial-gradient(circle, ${current.color} 0%, transparent 65%)`, transform: "scale(0.7)" }} />
            <div className="relative mx-auto phone-shadow"
              style={{ width: 260, background: "#111827", borderRadius: 46, padding: 10 }}>
              <div className="absolute z-10 top-3 left-1/2 -translate-x-1/2"
                style={{ width: 82, height: 24, background: "#111827", borderRadius: "0 0 14px 14px" }} />
              <div style={{ borderRadius: 36, overflow: "hidden", minHeight: 380 }}>
                <AnimatePresence mode="wait">
                  <motion.div key={current.screen}
                    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}>
                    <Image src={`/screenshots/${current.screen}`} alt={current.title}
                      width={240} height={520} className="w-full block" />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Description */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.38 }}
              className="flex-1">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: current.bg }}>
                <current.icon size={28} color={current.color} variant="Bold" />
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white mb-4">{current.title}</h3>
              <p className="text-slate-300 leading-relaxed mb-7 text-lg">{current.body}</p>
              <ul className="space-y-3">
                {current.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${current.color}22` }}>
                      <span className="w-2 h-2 rounded-full block" style={{ background: current.color }} />
                    </span>
                    <span className="text-slate-300 text-sm leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

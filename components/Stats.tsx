"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Building, Profile2User, Star1, Scan } from "iconsax-react";
import { useTranslation } from "@/contexts/LanguageContext";

const icons = [Building, Profile2User, Star1, Scan];
const colors = ["#17BDB0","#6366F1","#F59E0B","#FF6B7A"];
const bgs    = ["#E0F7F5","#EEF2FF","#FEF3C7","#FFE8EA"];
const ends   = [148, 500, 4.8, 0];
const suffixes = ["", "+", "★", "3D"];
const decimals = [0, 0, 1, 0];
const fixed    = [undefined, undefined, undefined, "3D"];

function Counter({ end, suffix, dec = 0, fx, color, started }: {
  end: number; suffix: string; dec?: number; fx?: string; color: string; started: boolean;
}) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!started || fx) return;
    const steps = 60; const step = end / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur = Math.min(cur + step, end); setVal(cur);
      if (cur >= end) clearInterval(t);
    }, 1600 / steps);
    return () => clearInterval(t);
  }, [started, end, fx]);
  if (fx) return <span style={{ color }}>{fx}</span>;
  return <span style={{ color }}>{val.toFixed(dec)}{suffix}</span>;
}

export default function Stats() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-16 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {t.stats.items.map((label, i) => {
            const Icon = icons[i];
            return (
              <motion.div key={label}
                initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
                whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 20 } }}
                className="rounded-2xl p-6 text-center cursor-default"
                style={{ background: "white", boxShadow: `0 4px 24px ${colors[i]}18, 0 1px 4px rgba(0,0,0,0.05)`, border: `1px solid ${colors[i]}18` }}>
                <motion.div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: bgs[i] }}
                  animate={inView ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}>
                  <Icon size={22} color={colors[i]} variant="Bold" />
                </motion.div>
                <p className="text-2xl font-black mb-1">
                  <Counter end={ends[i]} suffix={suffixes[i]} dec={decimals[i]} fx={fixed[i]} color={colors[i]} started={inView} />
                </p>
                <p className="text-xs text-slate-500 font-medium">{label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

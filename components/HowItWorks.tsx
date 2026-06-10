"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Setting2, Heart, Messages2 } from "iconsax-react";
import { useTranslation } from "@/contexts/LanguageContext";

const icons   = [Setting2, Heart, Messages2];
const screens = ["tenant/filters.png", "tenant/swipe.png", "tenant/chat.png"];
const colors  = ["#17BDB0", "#FF6B7A", "#6366F1"];
const bgs     = ["#E0F7F5", "#FFE8EA", "#EEF2FF"];

export default function HowItWorks() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how" className="py-28 px-4"
      style={{ background: "linear-gradient(180deg, #F8FFFE 0%, #fff 100%)" }}>
      <div className="max-w-6xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="text-center mb-20">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-5"
            style={{ background: "rgba(23,189,176,0.1)", border: "1px solid rgba(23,189,176,0.25)", color: "#0F8A80" }}>
            {t.how.badge}
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-[#1A2B4A] mb-4">{t.how.h2}</h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">{t.how.sub}</p>
        </motion.div>

        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20" ref={ref}>

          {/* Steps */}
          <div className="flex-1 w-full">
            {t.how.steps.map((step, i) => {
              const Icon = icons[i];
              const isActive = activeStep === i;
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, x: 24 }} animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: i * 0.15, duration: 0.55 }}
                  onClick={() => setActiveStep(i)}
                  className="flex gap-5 mb-6 cursor-pointer"
                  whileHover={{ x: 4 }}
                  style={{ transition: "transform 0.2s" }}>

                  <div className="flex flex-col items-center">
                    <motion.div
                      animate={{ background: isActive ? colors[i] : "#F1F5F9", color: isActive ? "white" : "#94A3B8", scale: isActive ? 1.1 : 1 }}
                      transition={{ duration: 0.3 }}
                      className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0">
                      {isActive ? <Icon size={20} color="white" variant="Bold" /> : <span>{String(i + 1).padStart(2, "0")}</span>}
                    </motion.div>
                    {i < t.how.steps.length - 1 && (
                      <div className="w-0.5 flex-1 mt-2 rounded-full"
                        style={{ background: "linear-gradient(to bottom, #E2E8F0, transparent)", minHeight: 32 }} />
                    )}
                  </div>

                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bgs[i] }}>
                        <Icon size={14} color={colors[i]} variant="Bold" />
                      </div>
                      <h3 className="text-base font-black text-[#1A2B4A]">{step.title}</h3>
                    </div>
                    <AnimatePresence>
                      {isActive && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.28 }}
                          className="text-sm text-slate-500 leading-relaxed">
                          {step.body}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Phone */}
          <motion.div
            initial={{ opacity: 0, x: -30 }} animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex-shrink-0 relative">
            <div className="absolute inset-0 blur-3xl opacity-20 -z-10 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${colors[activeStep]} 0%, transparent 65%)`, transform: "scale(0.7)" }} />
            <motion.div
              animate={{ y: [0, -8, 0] }} transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
              className="relative mx-auto phone-shadow"
              style={{ width: 250, background: "#111827", borderRadius: 44, padding: 10 }}>
              <div className="absolute z-10 top-3 left-1/2 -translate-x-1/2"
                style={{ width: 80, height: 24, background: "#111827", borderRadius: "0 0 14px 14px" }} />
              <div style={{ borderRadius: 34, overflow: "hidden", minHeight: 360 }}>
                <AnimatePresence mode="wait">
                  <motion.div key={screens[activeStep]}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.38, ease: "easeInOut" }}>
                    <Image src={`/screenshots/${screens[activeStep]}`} alt={t.how.steps[activeStep].title}
                      width={230} height={498} className="w-full block" />
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
            <div className="flex justify-center gap-2 mt-5">
              {screens.map((_, i) => (
                <motion.button key={i} onClick={() => setActiveStep(i)}
                  animate={{ width: activeStep === i ? 20 : 6, background: activeStep === i ? colors[i] : "#CBD5E1" }}
                  transition={{ duration: 0.3 }} style={{ height: 6, borderRadius: 99 }}
                  className="cursor-pointer" aria-label={`${t.how.stepLabel} ${i + 1}`} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

"use client";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import {
  motion, AnimatePresence,
  useScroll, useTransform, useMotionValue, useSpring,
} from "framer-motion";
import { Apple, Google, Star1, Flash, ShieldTick } from "iconsax-react";
import { useTranslation } from "@/contexts/LanguageContext";

const heroFiles = ["tenant/swipe.png", "tenant/property.png", "tenant/matches.png"];

function useMouse(stiff = 70, damp = 28) {
  const rx = useMotionValue(0); const ry = useMotionValue(0);
  const x  = useSpring(rx, { stiffness: stiff, damping: damp });
  const y  = useSpring(ry, { stiffness: stiff, damping: damp });
  useEffect(() => {
    const h = (e: MouseEvent) => {
      rx.set((e.clientX / window.innerWidth  - 0.5) * 2);
      ry.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, [rx, ry]);
  return { x, y };
}

function SplitReveal({ text, delay = 0 }: { text: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <motion.span key={i}
          style={{ display: "inline-block", overflow: "hidden", marginInlineEnd: i < words.length - 1 ? "0.25em" : 0 }}
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          whileInView={{ clipPath: "inset(0 0% 0 0)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number,number,number,number], delay: delay + i * 0.07 }}>
          {w}
        </motion.span>
      ))}
    </>
  );
}

export default function Hero() {
  const { t } = useTranslation();
  const heroRef = useRef<HTMLElement>(null);
  const [screen, setScreen] = useState(0);
  const mouse = useMouse();

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const blob1Y      = useTransform(scrollYProgress, [0,1], ["0%", "-55%"]);
  const blob2Y      = useTransform(scrollYProgress, [0,1], ["0%", "-35%"]);
  const blob3Y      = useTransform(scrollYProgress, [0,1], ["0%", "-20%"]);
  const phoneY      = useTransform(scrollYProgress, [0,1], ["0%", "-12%"]);
  const textY       = useTransform(scrollYProgress, [0,1], ["0%",  "18%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  const phoneRotateY = useTransform(mouse.x, [-1,1], [-14, 14]);
  const phoneRotateX = useTransform(mouse.y, [-1,1], [  9, -9]);

  const chip1X = useTransform(mouse.x, [-1,1], [ 18,-18]);
  const chip1Y = useTransform(mouse.y, [-1,1], [-12, 12]);
  const chip2X = useTransform(mouse.x, [-1,1], [-14, 14]);
  const chip2Y = useTransform(mouse.y, [-1,1], [ 10,-10]);

  useEffect(() => {
    const id = setInterval(() => setScreen(n => (n+1) % heroFiles.length), 3400);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.section
      ref={heroRef}
      style={{ opacity: heroOpacity }}
      className="min-h-screen relative overflow-hidden flex items-center pt-24 pb-20 px-4 noise">

      <div className="absolute inset-0 mesh-bg" />
      <div className="absolute inset-0 dot-grid pointer-events-none opacity-30" />

      {/* Parallax blobs */}
      <motion.div style={{ y: blob1Y, background: "radial-gradient(circle, rgba(23,189,176,0.26) 0%, transparent 65%)" }}
        className="absolute -top-40 -right-40 w-[800px] h-[800px] rounded-full pointer-events-none animate-blob" />
      <motion.div style={{ y: blob2Y, background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 65%)" }}
        className="absolute -bottom-60 -left-40 w-[700px] h-[700px] rounded-full pointer-events-none animate-blob-delayed" />
      <motion.div style={{ y: blob3Y, background: "radial-gradient(circle, rgba(255,107,122,0.14) 0%, transparent 65%)" }}
        className="absolute top-1/2 left-1/3 w-[400px] h-[400px] rounded-full pointer-events-none opacity-60" />

      <div className="max-w-6xl w-full mx-auto flex flex-col lg:flex-row items-center gap-14 relative z-10">

        {/* ── Text side ── */}
        <motion.div style={{ y: textY }} className="flex-1 text-center lg:text-start order-2 lg:order-1">

          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 mb-7 px-4 py-2 rounded-full text-[#0F8A80] text-sm font-bold cursor-default"
            style={{ background: "rgba(23,189,176,0.12)", border: "1px solid rgba(23,189,176,0.32)", boxShadow: "0 4px 20px rgba(23,189,176,0.15)" }}>
            <Flash size={13} color="#17BDB0" variant="Bold" />
            {t.hero.badge}
          </motion.div>

          <h1 className="text-5xl md:text-[68px] xl:text-[82px] font-black text-[#1A2B4A] leading-[1.02] mb-6 tracking-tight">
            <motion.span className="block"
              initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22,1,0.36,1] as [number,number,number,number] }}>
              {t.hero.h1a}
            </motion.span>
            <span className="block gradient-text">
              <SplitReveal text={t.hero.h1b} delay={0.3} />
            </span>
            <span className="block gradient-text">
              <SplitReveal text={t.hero.h1c} delay={0.5} />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.55, ease: [0.22,1,0.36,1] as [number,number,number,number] }}
            className="text-xl md:text-2xl text-slate-500 leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
            {t.hero.sub.split("\n")[0]}
            {t.hero.sub.split("\n")[1] && (
              <span className="block text-lg mt-1 text-slate-400">{t.hero.sub.split("\n")[1]}</span>
            )}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-wrap gap-3 justify-center lg:justify-start mb-10">
            <MagneticBtn href="#herolead" dark>
              <Apple size={22} color="#fff" variant="Bold" />
              <div className="leading-tight">
                <div className="text-[10px] opacity-55">{t.hero.s1sub}</div>
                <div>{t.hero.s1}</div>
              </div>
            </MagneticBtn>
            <MagneticBtn href="#herolead">
              <Google size={22} color="#1A2B4A" variant="Bold" />
              <div className="leading-tight">
                <div className="text-[10px] opacity-55">{t.hero.s2sub}</div>
                <div>{t.hero.s2}</div>
              </div>
            </MagneticBtn>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.95 }}
            className="flex flex-wrap items-center gap-5 justify-center lg:justify-start">
            <div className="flex -space-x-2 space-x-reverse">
              {["נ","י","מ","א","ש"].map((l, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 + i*0.07, type: "spring", stiffness: 280, damping: 18 }}
                  className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-xs font-black"
                  style={{
                    background: ["#E0F7F5","#E8EEFF","#FFE8EA","#FEF3C7","#F3E8FF"][i],
                    color: ["#0F8A80","#4F46E5","#FF6B7A","#D97706","#7C3AED"][i],
                    zIndex: 5-i,
                  }}>
                  {l}
                </motion.div>
              ))}
            </div>
            <div>
              <div className="flex gap-0.5 justify-center lg:justify-start">
                {[0,1,2,3,4].map(i => <Star1 key={i} size={14} color="#F59E0B" variant="Bold" />)}
              </div>
              <p className="text-xs text-slate-500 mt-1">{t.hero.trust}</p>
            </div>
          </motion.div>
        </motion.div>

        {/* ── Phone side ── */}
        <motion.div style={{ y: phoneY }}
          className="flex-shrink-0 order-1 lg:order-2 relative"
          initial={{ opacity: 0, x: -40, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22,1,0.36,1] as [number,number,number,number], delay: 0.12 }}>

          <div className="absolute inset-0 pointer-events-none -z-10 rounded-full blur-3xl opacity-40 glow-pulse"
            style={{ background: "radial-gradient(circle, #17BDB0 0%, #6366F1 60%, transparent 100%)", transform: "scale(0.75) translateY(8%)" }} />

          {/* 3D tilt phone */}
          <motion.div
            style={{
              rotateY: phoneRotateY,
              rotateX: phoneRotateX,
              perspective: 1100,
              width: 270,
              background: "#111827",
              borderRadius: 48,
              padding: 12,
            }}
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 5.5, ease: "easeInOut", repeat: Infinity }}
            className="relative mx-auto phone-shadow tilt-card">
            <div className="absolute z-10 top-3 left-1/2 -translate-x-1/2"
              style={{ width: 88, height: 26, background: "#111827", borderRadius: "0 0 16px 16px" }} />
            <div style={{ borderRadius: 38, overflow: "hidden", minHeight: 420 }}>
              <AnimatePresence mode="wait">
                <motion.div key={screen}
                  initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}>
                  <Image src={`/screenshots/${heroFiles[screen]}`} alt="Rently App"
                    width={246} height={533} className="w-full block" priority />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Chip: match % */}
          <motion.div style={{ x: chip1X, y: chip1Y, top: 68, insetInlineEnd: -80, zIndex: 20 }}
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.1, type: "spring", stiffness: 180, damping: 18 }}
            className="glass absolute hidden md:flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl">
            <motion.div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm"
              animate={{ boxShadow: ["0 0 0 0 rgba(23,189,176,0.4)","0 0 0 8px rgba(23,189,176,0)"] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ background: "rgba(23,189,176,0.14)", color: "#17BDB0", border: "1.5px solid rgba(23,189,176,0.3)" }}>
              87%
            </motion.div>
            <div>
              <p className="text-xs font-bold text-[#1A2B4A] leading-none">רמת גן, 4 חד׳</p>
              <p className="text-[10px] text-slate-400 mt-1">תואם להעדפות שלך</p>
            </div>
          </motion.div>

          {/* Chip: verified */}
          <motion.div style={{ x: chip2X, y: chip2Y, bottom: 90, insetInlineStart: -80, zIndex: 20 }}
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.3, type: "spring", stiffness: 180, damping: 18 }}
            className="glass absolute hidden md:flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl">
            <motion.div className="w-9 h-9 rounded-xl flex items-center justify-center"
              whileHover={{ rotate: 15, scale: 1.15 }} transition={{ type: "spring", stiffness: 400 }}
              style={{ background: "rgba(16,185,129,0.12)" }}>
              <ShieldTick size={18} color="#10B981" variant="Bold" />
            </motion.div>
            <div>
              <p className="text-xs font-bold text-[#1A2B4A] leading-none">מאומת ✓</p>
              <p className="text-[10px] text-slate-400 mt-1">תמונות ממשיות</p>
            </div>
          </motion.div>

          {/* Screen dots */}
          <div className="flex justify-center gap-1.5 mt-5">
            {heroFiles.map((_, i) => (
              <motion.button key={i} onClick={() => setScreen(i)}
                animate={{ width: screen===i ? 20 : 6, background: screen===i ? "#17BDB0" : "rgba(26,43,74,0.2)" }}
                transition={{ duration: 0.3 }}
                style={{ height: 6, borderRadius: 99, border: "none", cursor: "pointer", padding: 0 }}
                aria-label={`screen ${i+1}`} />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.a href="#herolead"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-pointer no-underline"
        style={{ color: "rgba(26,43,74,0.3)" }}>
        <span className="text-[10px] font-semibold tracking-widest uppercase">scroll</span>
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </motion.a>
    </motion.section>
  );
}

function MagneticBtn({ href, dark, children }: { href: string; dark?: boolean; children: React.ReactNode }) {
  const mx = useMotionValue(0); const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 260, damping: 20 });
  const sy = useSpring(my, { stiffness: 260, damping: 20 });

  function onMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left  - r.width /2) * 0.35);
    my.set((e.clientY - r.top   - r.height/2) * 0.35);
  }
  function onLeave() { mx.set(0); my.set(0); }

  const extraStyle = dark
    ? { background: "linear-gradient(135deg, #17BDB0, #0F8A80)", boxShadow: "0 10px 30px rgba(23,189,176,0.4)" }
    : { boxShadow: "0 4px 16px rgba(26,43,74,0.12)", borderColor: "#1A2B4A" };

  return (
    <motion.a href={href}
      style={{ x: sx, y: sy, ...extraStyle }}
      onMouseMove={onMove} onMouseLeave={onLeave}
      whileTap={{ scale: 0.95 }}
      className={`relative inline-flex items-center gap-3 px-7 py-4 rounded-2xl font-bold text-sm cursor-pointer overflow-hidden ${dark ? "text-white" : "text-[#1A2B4A] border-2 bg-white"}`}>
      {dark && <span className="absolute inset-0 shimmer-bg opacity-30 pointer-events-none" />}
      <span className="relative flex items-center gap-3">{children}</span>
    </motion.a>
  );
}

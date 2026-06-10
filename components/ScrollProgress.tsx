"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const el = document.documentElement;
      const scrolled = el.scrollTop || document.body.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[3px] pointer-events-none"
      style={{ background: "rgba(23,189,176,0.12)" }}>
      <motion.div
        className="h-full rounded-full"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(90deg, #17BDB0, #6366F1)",
          boxShadow: "0 0 8px rgba(23,189,176,0.6)",
        }}
        transition={{ duration: 0.05 }}
      />
    </div>
  );
}

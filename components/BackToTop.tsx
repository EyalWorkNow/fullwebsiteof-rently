"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp2 } from "iconsax-react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible((window.scrollY || document.documentElement.scrollTop) > 600);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.7, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 16 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 left-4 sm:bottom-7 sm:left-6 z-40 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center cursor-pointer shadow-lg"
          style={{
            background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
            boxShadow: "0 8px 24px rgba(37,99,235,0.4)",
          }}
          whileHover={{ scale: 1.12, y: -2 }}
          whileTap={{ scale: 0.92 }}
          aria-label="חזרה למעלה">
          <ArrowUp2 size={18} color="white" variant="Bold" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

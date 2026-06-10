"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp2 } from "iconsax-react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible((window.scrollY || document.documentElement.scrollTop) > 400);
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
          className="fixed bottom-7 left-6 z-50 w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer shadow-lg"
          style={{
            background: "linear-gradient(135deg, #17BDB0, #0F8A80)",
            boxShadow: "0 8px 24px rgba(23,189,176,0.4)",
          }}
          whileHover={{ scale: 1.12, y: -2 }}
          whileTap={{ scale: 0.92 }}
          aria-label="Back to top">
          <ArrowUp2 size={18} color="white" variant="Bold" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

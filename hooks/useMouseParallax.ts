"use client";
import { useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";

export function useMouseParallax(stiffness = 80, damping = 25) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness, damping });
  const y = useSpring(rawY, { stiffness, damping });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      rawX.set((e.clientX / window.innerWidth  - 0.5) * 2);
      rawY.set((e.clientY / window.innerHeight - 0.5) * 2);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [rawX, rawY]);

  return { x, y };
}

"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

/**
 * A round label that follows the mouse over anything marked data-cursor,
 * for example data-cursor="View" on a stay card. Elsewhere the normal
 * pointer stays, so nothing about using the site changes.
 */
export function Cursor() {
  const reduce = useReducedMotion();
  const [label, setLabel] = useState<string | null>(null);
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const spring = reduce ? { stiffness: 2000, damping: 100 } : { stiffness: 420, damping: 38, mass: 0.6 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const move = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-cursor]") : null;
      setLabel(target?.dataset.cursor ?? null);
    };
    const leave = () => setLabel(null);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [x, y]);

  return (
    <motion.div aria-hidden className="pointer-events-none fixed left-0 top-0 z-[80]" style={{ x: sx, y: sy }}>
      <div
        className={`label flex size-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-forest shadow-[0_10px_40px_rgb(11_24_19/0.25)] transition-[scale,opacity] duration-300 ease-out ${
          label ? "scale-100 opacity-100" : "scale-0 opacity-0"
        }`}
      >
        {label}
      </div>
    </motion.div>
  );
}

"use client";

import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";

// A little heavier than the browser's own scroll, so the page glides.
const options = { lerp: 0.075, wheelMultiplier: 0.9, anchors: { offset: -24 }, autoRaf: true };

/**
 * Inertial page scroll. It mounts beside the page, not around it, so
 * switching it off for reduced-motion users never remounts the content.
 */
export function SmoothScroll() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return <ReactLenis root options={options} />;
}

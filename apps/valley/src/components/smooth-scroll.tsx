"use client";

import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";

const options = { lerp: 0.085, wheelMultiplier: 0.9, anchors: { offset: -24 }, autoRaf: true };

/**
 * Weighted, inertial page scroll. It mounts beside the page, not around it,
 * so switching it off for reduced-motion users never remounts the content.
 */
export function SmoothScroll() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return <ReactLenis root options={options} />;
}

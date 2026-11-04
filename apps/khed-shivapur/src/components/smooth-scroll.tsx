"use client";

import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";

const options = { lerp: 0.085, wheelMultiplier: 0.9, anchors: { offset: -24 }, autoRaf: true, stopInertiaOnNavigate: true };

/**
 * Weighted, inertial page scroll. It mounts beside the page, not around it,
 * so switching it off for reduced-motion users never remounts the content.
 * A click on a link to another page stops any glide still running, so the
 * new page opens at its top and is not carried down to the old position.
 */
export function SmoothScroll() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return <ReactLenis root options={options} />;
}

"use client";

import Image from "next/image";
import { useRef, useSyncExternalStore } from "react";
import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform } from "motion/react";
import { photos, type PhotoKey } from "@/content/photos";

type ParallaxPhotoProps = {
  name: PhotoKey;
  alt: string;
  sizes: string;
  className?: string;
  imgClassName?: string;
  /** How far the photo drifts inside its frame, as a percentage of the frame height. */
  depth?: number;
};

const noop = () => () => {};

/**
 * A photo that moves slightly slower than the page, so the frame reads as
 * a window and the photo as the view behind it.
 */
export function ParallaxPhoto({ name, alt, sizes, className = "", imgClassName = "", depth = 7 }: ParallaxPhotoProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Match the server's render first; the reduced-motion setting applies after hydration.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const reduce = useReducedMotion() && mounted;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-depth, depth]);
  const transform = useMotionTemplate`translate3d(0, ${y}%, 0)`;

  return (
    <div ref={ref} className={`relative overflow-hidden bg-stone ${className}`}>
      <motion.div
        className="absolute inset-x-0"
        style={{ top: `-${depth}%`, bottom: `-${depth}%`, transform: reduce ? undefined : transform }}
      >
        <Image src={photos[name]} alt={alt} fill sizes={sizes} placeholder="blur" className={`object-cover ${imgClassName}`} />
      </motion.div>
    </div>
  );
}

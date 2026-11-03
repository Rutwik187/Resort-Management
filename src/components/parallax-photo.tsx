"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform } from "motion/react";
import { photos, type PhotoKey } from "@/content/photos";

type ParallaxPhotoProps = {
  name: PhotoKey;
  alt: string;
  sizes: string;
  className?: string;
  /** How far the photo drifts inside its frame, as a percentage of the frame height. */
  depth?: number;
  preload?: boolean;
};

/**
 * A photo that drifts slightly slower than the page, so the frame reads
 * as a window and the photo as the view behind it.
 */
export function ParallaxPhoto({ name, alt, sizes, className = "", depth = 8, preload }: ParallaxPhotoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-depth, depth]);
  const transform = useMotionTemplate`translate3d(0, ${y}%, 0)`;

  return (
    <div ref={ref} className={`relative overflow-hidden bg-canopy ${className}`}>
      <motion.div
        className="absolute inset-x-0"
        style={{ top: `-${depth}%`, bottom: `-${depth}%`, transform: reduce ? undefined : transform }}
      >
        <Image src={photos[name]} alt={alt} fill sizes={sizes} placeholder="blur" preload={preload} className="object-cover" />
      </motion.div>
    </div>
  );
}

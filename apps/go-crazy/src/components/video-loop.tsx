"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";

/** One clip in two codecs. AV1 for Chrome, Edge and Firefox; HEVC for Safari. */
export type VideoSources = { av1: string; hevc: string };

type VideoLoopProps = {
  /** Without sources the frame shows the poster alone. */
  sources?: VideoSources;
  poster: StaticImageData;
  alt: string;
  sizes: string;
  /** The first thing on the page: load the poster at high priority. */
  priority?: boolean;
  /** In the first screen but not the most important image: load now, at normal priority. */
  eager?: boolean;
  /** Pause while false, for example while another clip has the screen. */
  active?: boolean;
  className?: string;
  mediaClassName?: string;
};

const noop = () => () => {};

/** Visitors who ask to save data get the still photograph only. */
function saveData() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(connection?.saveData);
}

/**
 * A silent, looping clip. The poster is a normal optimised image, so it is
 * what loads first and what the browser measures; only the first one on the page is preloaded. The video is added after
 * hydration, fades in only once frames are actually playing, and plays only
 * while it is on screen.
 */
export function VideoLoop({ sources, poster, alt, sizes, priority, eager, active = true, className = "", mediaClassName = "" }: VideoLoopProps) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [onScreen, setOnScreen] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: "20% 0px" });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const showVideo = Boolean(sources) && mounted && !reduce && !saveData();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (onScreen && active) video.play().catch(() => {});
    else video.pause();
  }, [onScreen, active, showVideo]);

  return (
    <div ref={ref} className={`absolute inset-0 overflow-hidden bg-pine ${className}`}>
      <Image
        src={poster}
        alt={alt}
        fill
        sizes={sizes}
        quality={75}
        preload={priority}
        loading={priority || eager ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className={`object-cover ${mediaClassName}`}
      />
      {showVideo && sources && (
        <video
          ref={videoRef}
          aria-hidden
          muted
          loop
          playsInline
          preload={priority ? "auto" : "metadata"}
          onPlaying={() => setPlaying(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${mediaClassName} ${
            playing ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src={sources.av1} type='video/mp4; codecs="av01.0.08M.08"' />
          <source src={sources.hevc} type='video/mp4; codecs="hvc1.1.6.L120.90"' />
        </video>
      )}
    </div>
  );
}

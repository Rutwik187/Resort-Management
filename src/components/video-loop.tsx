"use client";

import { getImageProps, type StaticImageData } from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";

/** One clip in two codecs. AV1 for Chrome, Edge and Firefox; HEVC for Safari. */
export type VideoSources = { av1: string; hevc: string };

type VideoLoopProps = {
  sources: VideoSources;
  /** A vertical cut for phones held upright. Falls back to `sources`. */
  portraitSources?: VideoSources;
  poster: StaticImageData;
  portraitPoster?: StaticImageData;
  alt: string;
  sizes: string;
  /** The first thing on the page: load the poster at high priority. */
  priority?: boolean;
  /** Pause while false, for example while another scene covers this one. */
  active?: boolean;
  className?: string;
  mediaClassName?: string;
};

const PORTRAIT = "(orientation: portrait) and (max-width: 900px)";

const noop = () => () => {};

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(PORTRAIT);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Visitors who ask to save data get the still photograph only. */
function saveData() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(connection?.saveData);
}

/**
 * A silent, looping film. The poster is a normal optimised image, so it is
 * what loads first and what the browser measures. The video is added after
 * hydration, fades in only once frames are actually playing, and plays only
 * while it is on screen.
 */
export function VideoLoop({
  sources,
  portraitSources,
  poster,
  portraitPoster,
  alt,
  sizes,
  priority,
  active = true,
  className = "",
  mediaClassName = "",
}: VideoLoopProps) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const portrait = useSyncExternalStore(subscribe, () => window.matchMedia(PORTRAIT).matches, () => false);
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [onScreen, setOnScreen] = useState(false);
  const [playingSrc, setPlayingSrc] = useState<string | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: "25% 0px" });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const showVideo = mounted && !reduce && !saveData();
  const clip = portrait && portraitSources ? portraitSources : sources;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (onScreen && active) video.play().catch(() => {});
    else video.pause();
  }, [onScreen, active, clip]);

  const common = { alt, sizes, quality: 75 };
  const {
    props: { srcSet: landscapeSet, ...img },
  } = getImageProps({ ...common, src: poster, fill: true });
  const portraitSet = portraitPoster ? getImageProps({ ...common, src: portraitPoster, fill: true }).props.srcSet : undefined;

  return (
    <div ref={ref} className={`absolute inset-0 overflow-hidden bg-forest ${className}`}>
      <picture>
        {portraitSet && <source media={PORTRAIT} srcSet={portraitSet} sizes={sizes} />}
        {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
        <img
          {...img}
          srcSet={landscapeSet}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className={`object-cover ${mediaClassName}`}
        />
      </picture>
      {showVideo && (
        <video
          key={clip.av1}
          ref={videoRef}
          aria-hidden
          muted
          loop
          playsInline
          preload={priority ? "auto" : "metadata"}
          onPlaying={() => setPlayingSrc(clip.av1)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-out ${mediaClassName} ${
            playingSrc === clip.av1 ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src={clip.av1} type='video/mp4; codecs="av01.0.08M.08"' />
          <source src={clip.hevc} type='video/mp4; codecs="hvc1.1.6.L120.90"' />
        </video>
      )}
    </div>
  );
}

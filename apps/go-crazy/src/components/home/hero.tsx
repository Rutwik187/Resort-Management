"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionStyle } from "motion/react";
import type { StaticImageData } from "next/image";
import { dayPasses, formatRupees } from "@/content/resort";
import { photos } from "@/content/photos";
import { VideoLoop, type VideoSources } from "../video-loop";

type Panel = { id: string; label: string; caption: string; alt: string; poster: StaticImageData; sources?: VideoSources };

/*
 * Three passes, three moments of the same day: water, height and a climb.
 * All of it is the park's own phone footage, shot upright, so on a big
 * screen the three stand side by side and on a phone each one fills it in turn.
 */
const panels: Panel[] = [
  {
    id: "water",
    label: "Water",
    caption: "The twin slides into the main pool",
    alt: "Two yellow water slides running down into a turquoise pool under the trees",
    poster: photos.slides,
  },
  {
    id: "heights",
    label: "Heights",
    caption: "Off the platform on the zip line",
    alt: "A rider in a red helmet pushing off a high platform on the zip line, treetops below",
    poster: photos.zipline,
  },
  {
    id: "climb",
    label: "Climb",
    caption: "Halfway up the climbing tower",
    alt: "A climber in a harness halfway up the climbing tower, against a clear blue sky",
    poster: photos.climb,
  },
];

const STORY_MS = 5200;
const fromPrice = formatRupees(Math.min(...dayPasses.map((p) => p.adult)));

const WIDE = "(min-width: 1024px)";
function subscribe(onChange: () => void) {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const wide = useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches, () => false);
  const [current, setCurrent] = useState(0);
  // Bumped on every manual choice, so the progress bar restarts from zero.
  const [round, setRound] = useState(0);

  // On phones, move to the next pass when the bar fills.
  useEffect(() => {
    if (wide || reduce) return;
    const timer = window.setTimeout(() => setCurrent((n) => (n + 1) % panels.length), STORY_MS);
    return () => window.clearTimeout(timer);
  }, [current, round, wide, reduce]);

  // As the page scrolls away, the outer panels drift faster than the middle one.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const drift0 = useTransform(scrollYProgress, [0, 1], ["0%", "-14%"]);
  const drift1 = useTransform(scrollYProgress, [0, 1], ["0%", "-5%"]);
  const drift2 = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);
  const drift = [drift0, drift1, drift2];

  const choose = (i: number) => {
    setCurrent(i);
    setRound((n) => n + 1);
  };

  return (
    <section ref={ref} data-tone="film" aria-labelledby="hero-title" className="relative h-svh min-h-[600px] overflow-hidden bg-ink text-chalk">
      {/* The panels: side by side on large screens, stacked in one cell and shown one at a time on phones. */}
      <div className="absolute inset-0 grid gap-[6px] lg:grid-cols-3">
        {panels.map((panel, i) => {
          const shown = wide || current === i;
          return (
            <motion.figure
              key={panel.id}
              aria-hidden={!shown}
              className={`hero-panel relative col-start-1 row-start-1 overflow-hidden transition-opacity duration-500 lg:col-auto lg:row-auto ${
                current === i ? "opacity-100" : "opacity-100 max-lg:opacity-0"
              }`}
              style={{ "--i": i, y: wide && !reduce ? drift[i] : undefined } as MotionStyle}
            >
              <VideoLoop
                sources={panel.sources}
                poster={panel.poster}
                alt={panel.alt}
                sizes="(min-width: 1024px) 34vw, 100vw"
                priority={i === 0}
                eager
                active={shown}
                className="hero-drift"
              />
              <figcaption className="absolute inset-x-0 top-[96px] flex items-center justify-between gap-4 px-4 md:top-[108px] md:px-6">
                <span className="label marker marker-lime [text-shadow:0_1px_12px_rgb(14_26_20/0.6)]">
                  0{i + 1} · {panel.label}
                </span>
                <span className="hidden text-[0.88rem] text-chalk/90 [text-shadow:0_1px_12px_rgb(14_26_20/0.6)] xl:block">{panel.caption}</span>
              </figcaption>
            </motion.figure>
          );
        })}
      </div>

      {/* Story bars, phones only. Each bar is also a button that jumps to its pass. */}
      <div className="absolute inset-x-4 top-[70px] z-10 flex gap-1.5 lg:hidden" role="group" aria-label="Choose a moment">
        {panels.map((panel, i) => (
          <button
            key={panel.id}
            type="button"
            onClick={() => choose(i)}
            aria-label={panel.label}
            aria-pressed={current === i}
            className="relative h-6 flex-1"
          >
            <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-chalk/30">
              {(i < current || (i === current && reduce)) && <span className="absolute inset-0 bg-chalk" />}
              {i === current && !reduce && (
                <span key={round} className="story-bar absolute inset-0 bg-lime" style={{ "--story": `${STORY_MS}ms` } as React.CSSProperties} />
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Shade under the words, so they read over any frame. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 px-4 pb-6 md:px-8 md:pb-9">
        <div className="mx-auto max-w-[1600px]">
          <h1 id="hero-title" className="leading-[0.8]">
            <span className="sr-only">Prathamesh Go Crazy, an adventure park and resort at Sinhagad, Pune.</span>
            <span aria-hidden className="hero-snap block whitespace-nowrap text-[clamp(5rem,23.5vw,9rem)] md:text-[clamp(8rem,19vw,19rem)]">
              Go crazy
            </span>
          </h1>

          <div className="mt-5 grid gap-6 border-t-2 border-chalk/30 pt-5 md:mt-7 md:grid-cols-12 md:items-end">
            <p className="hero-fade max-w-md text-[1.02rem] leading-snug text-chalk/90 md:col-span-5" style={{ "--i": 0 } as React.CSSProperties}>
              An adventure park and resort at the foot of Sinhagad fort, with more than 70 activities, four day passes
              and cottages for the night.
            </p>
            <div className="hero-fade flex flex-wrap items-center gap-x-6 gap-y-3 md:col-span-7 md:justify-end" style={{ "--i": 1 } as React.CSSProperties}>
              <a href="#enquire" className="btn btn-lime">
                Plan a day out <span aria-hidden className="arrow">→</span>
              </a>
              <Link href="/day-packages" className="link-line text-chalk">
                Day passes from {fromPrice}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

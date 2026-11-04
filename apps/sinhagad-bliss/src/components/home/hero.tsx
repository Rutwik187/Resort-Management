"use client";

import { getImageProps } from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { photos } from "@/content/photos";

/*
 * From day to dusk. The page opens on a cottage under the Sinhagad hills
 * (in March; phones get an upright view of the cottages in the monsoon).
 * As the visitor scrolls, dusk falls over it, the lawns light up (a frame
 * from the resort's own drone film; phones get an upright night photo),
 * and the sun from the logo sets on the horizon line at the foot of the screen.
 */
const scenes = [
  { lead: "By day, the", accent: "mountain", caption: "A cottage under the Sinhagad hills" },
  { lead: "By dusk, the", accent: "lawns", caption: "The cottages and lawns at dusk" },
];

const PORTRAIT = "(orientation: portrait) and (max-width: 900px)";

const noop = () => () => {};

/** The day photo, with an upright cut for phones held upright. Loaded first, at high priority. */
function DayPhoto() {
  const common = { alt: "A cottage with a white veranda on a lawn, the hills of Sinhagad rising behind it", sizes: "100vw", quality: 75 };
  const {
    props: { srcSet: wideSet, ...img },
  } = getImageProps({ ...common, src: photos.cottageMarch, fill: true });
  const tallSet = getImageProps({ ...common, src: photos.cottageHillsM, fill: true }).props.srcSet;
  return (
    <picture>
      <source media={PORTRAIT} srcSet={tallSet} sizes="100vw" />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
      <img {...img} srcSet={wideSet} loading="eager" fetchPriority="high" className="object-cover object-[50%_45%]" />
    </picture>
  );
}

/** The dusk scene: the drone's view of the lit lawns, or an upright night photo on phones. */
function DuskPhoto() {
  const common = { alt: "Cottages with lights along their eaves beside a lawn at dusk", sizes: "100vw", quality: 75 };
  const {
    props: { srcSet: wideSet, ...img },
  } = getImageProps({ ...common, src: photos.duskLawn, fill: true });
  const tallSet = getImageProps({ ...common, src: photos.cottageNight, fill: true }).props.srcSet;
  return (
    <picture>
      <source media={PORTRAIT} srcSet={tallSet} sizes="100vw" />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
      <img {...img} srcSet={wideSet} className="object-cover object-[58%_50%]" />
    </picture>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  // The server cannot know the visitor's motion setting, so the first render
  // always matches the server's, and the still version follows after hydration.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const still = mounted && Boolean(reduce);
  const [scene, setScene] = useState(0);
  // The dusk frame waits until the day photo has had the network to itself.
  const [later, setLater] = useState(false);

  useEffect(() => {
    const show = () => setLater(true);
    const timer = window.setTimeout(show, 1600);
    window.addEventListener("scroll", show, { once: true, passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", show);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // Dusk falls over the day photo, then the lit lawns surface through it.
  const dayScale = useTransform(scrollYProgress, [0, 1], [1, 1.14]);
  const dusk = useTransform(scrollYProgress, [0.12, 0.55], [0, 0.95]);
  const lawns = useTransform(scrollYProgress, [0.42, 0.78], [0, 1]);
  const lawnsScale = useTransform(scrollYProgress, [0.42, 1], [1.16, 1]);

  // The words go out of focus and the next ones come into it.
  const out1 = useTransform(scrollYProgress, [0.28, 0.44], [1, 0]);
  const blur1 = useTransform(scrollYProgress, [0.28, 0.44], [0, 14]);
  const in2 = useTransform(scrollYProgress, [0.5, 0.68], [0, 1]);
  const blur2 = useTransform(scrollYProgress, [0.5, 0.68], [14, 0]);
  const filter1 = useMotionTemplate`blur(${blur1}px)`;
  const filter2 = useMotionTemplate`blur(${blur2}px)`;
  const introOpacity = useTransform(scrollYProgress, [0.03, 0.16], [1, 0]);

  // The sun sinks below the horizon as the page scrolls on.
  const sunY = useTransform(scrollYProgress, [0, 0.9], [8, 115]);
  const sunTransform = useMotionTemplate`translate3d(-50%, ${sunY}%, 0)`;

  useMotionValueEvent(scrollYProgress, "change", (v) => setScene(v < 0.5 ? 0 : 1));
  // A still hero is one screen tall, where scroll progress means nothing: it stays on the day.
  const shown = still ? 0 : scene;

  return (
    <section
      ref={ref}
      data-tone="film"
      aria-labelledby="hero-title"
      className="relative bg-dusk text-mist"
      style={{ height: still ? "100svh" : "250svh" }}
    >
      <h1 id="hero-title" className="sr-only">
        Sinhagad Bliss, a mountain view resort in the foothills of Sinhagad, Pune.
      </h1>

      <div className="sticky top-0 h-svh overflow-hidden">
        <motion.div className="absolute inset-0" style={still ? undefined : { scale: dayScale }}>
          <div className="hero-settle absolute inset-0">
            <DayPhoto />
          </div>
        </motion.div>

        {!still && (
          <>
            {/* Multiplied blue, so the light turns blue as it fades, the sky first. */}
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-[#1c2840] via-[#2c3b55] to-[#3d4b5e] mix-blend-multiply"
              style={{ opacity: dusk }}
            />
            {later && (
              <motion.div className="absolute inset-0" style={{ opacity: lawns, scale: lawnsScale }}>
                <div className="drift absolute inset-0">
                  <DuskPhoto />
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Shade under the words, so they read over any frame. */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-night/85 via-night/35 to-transparent" />

        <div className="absolute inset-x-0 bottom-[calc(5.5rem+4svh)] px-5 text-center md:bottom-[calc(6rem+3svh)] md:px-10">
          <div aria-hidden className="relative mx-auto max-w-[1560px] text-[clamp(3.3rem,12.5vw,6.5rem)] md:text-[clamp(4.5rem,9vw,10rem)]">
            {scenes.map((s, i) => (
              <motion.p
                key={s.accent}
                className={`display leading-[0.95] ${i === 0 ? "relative" : "absolute inset-x-0 top-0"}`}
                style={
                  still
                    ? i === 0
                      ? undefined
                      : { display: "none" }
                    : i === 0
                      ? { opacity: out1, filter: filter1 }
                      : { opacity: in2, filter: filter2 }
                }
              >
                <span className={`block ${i === 0 ? "hero-focus" : ""}`}>
                  {s.lead} <em>{s.accent}</em>.
                </span>
              </motion.p>
            ))}
          </div>

          <motion.div className="mx-auto mt-6 max-w-xl md:mt-8" style={still ? undefined : { opacity: introOpacity }}>
            <p className="hero-fade text-[1rem] leading-snug text-mist/90 md:text-[1.08rem]" style={{ "--i": 0 } as React.CSSProperties}>
              A mountain view resort in the foothills of Sinhagad, Pune. Cottages, villas with private pools, and
              the hills in view.
            </p>
            <div className="hero-fade mt-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-3" style={{ "--i": 1 } as React.CSSProperties}>
              <Link href="/stays#book" tabIndex={-1} className="btn btn-mist hidden md:inline-flex">
                Book a stay
              </Link>
              <Link href="/stays" className="link-rule text-mist">
                See the rooms
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Caption, the setting sun, and a cue to scroll */}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5 md:px-10 md:pb-6">
          <div
            className="hero-fade mx-auto grid max-w-[1560px] grid-cols-[1fr_auto] items-end gap-6 md:grid-cols-[1fr_auto_1fr]"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            <p className="relative min-w-0 text-[0.85rem] text-mist/80 md:text-[0.9rem]">
              {scenes.map((s, i) => (
                <span
                  key={s.caption}
                  className={`block truncate transition-opacity duration-700 ${i === 0 ? "" : "absolute inset-0"} ${
                    shown === i ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {s.caption}
                </span>
              ))}
            </p>
            <div aria-hidden className="relative h-6 w-24 overflow-hidden md:w-40">
              <motion.span
                className="sun absolute left-1/2 top-0 size-6"
                style={still ? { transform: "translate3d(-50%, 30%, 0)" } : { transform: sunTransform }}
              />
              <span className="absolute inset-x-0 bottom-0 h-px bg-mist/50" />
            </div>
            <p className="kicker hidden items-center justify-end gap-3 text-mist/75 md:flex">
              {still ? "Sinhagad, Pune" : "Scroll to dusk"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

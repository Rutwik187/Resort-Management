"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionStyle,
} from "motion/react";
import { photos } from "@/content/photos";
import { VideoLoop } from "../video-loop";
import { Roll } from "../roll";

/*
 * The three words of the resort's own line, "Breathe | Relax | Enjoy",
 * each with its own view of the valley. All of it is the resort's own
 * footage: the film is from its drone in August 2024, and the two stills
 * were taken from 21 m above the pools on the same flight.
 */
const scenes = [
  { word: "Breathe.", caption: "The valley at Salawade, in the monsoon" },
  { word: "Relax.", caption: "The pool under the trees, from 21 m up" },
  { word: "Enjoy.", caption: "The waterfall pool, from 21 m up" },
];

const film = {
  sources: { av1: "/video/breathe.av1.mp4", hevc: "/video/breathe.hevc.mp4" },
  portraitSources: { av1: "/video/breathe-m.av1.mp4", hevc: "/video/breathe-m.hevc.mp4" },
};

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const still = Boolean(reduce);
  const [scene, setScene] = useState(0);
  const [filmActive, setFilmActive] = useState(true);
  // The two stills wait until the opening film has had the network to itself.
  const [later, setLater] = useState(false);

  useEffect(() => {
    const show = () => setLater(true);
    const timer = window.setTimeout(show, 1800);
    window.addEventListener("scroll", show, { once: true, passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", show);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // How far each later scene has opened, 0 to 1.
  const open2 = useTransform(scrollYProgress, [0.1, 0.42], [0, 1], { ease });
  const open3 = useTransform(scrollYProgress, [0.54, 0.86], [0, 1], { ease });

  // Each layer pushes in slightly as the next one opens over it.
  const scale1 = useTransform(open2, [0, 1], [1, 1.18]);
  const scale2 = useTransform(() => 1.28 - 0.28 * open2.get() + 0.14 * open3.get());
  const scale3 = useTransform(scrollYProgress, [0.54, 0.86, 1], [1.28, 1, 1.04]);

  // The words leave upward and the next arrives from below, each in its own mask.
  const y1 = useTransform(scrollYProgress, [0.17, 0.29], [0, -112]);
  const y2 = useTransform(scrollYProgress, [0.25, 0.38, 0.61, 0.73], [112, 0, 0, -112]);
  const y3 = useTransform(scrollYProgress, [0.69, 0.82], [112, 0]);
  const introOpacity = useTransform(scrollYProgress, [0.02, 0.12], [1, 0]);
  const progress = useMotionTemplate`scaleX(${scrollYProgress})`;

  useMotionValueEvent(scrollYProgress, "change", (v) => setScene(v < 0.33 ? 0 : v < 0.77 ? 1 : 2));
  useMotionValueEvent(open2, "change", (v) => setFilmActive(v < 0.99));

  const word1 = useMotionTemplate`translate3d(0, ${y1}%, 0)`;
  const word2 = useMotionTemplate`translate3d(0, ${y2}%, 0)`;
  const word3 = useMotionTemplate`translate3d(0, ${y3}%, 0)`;
  const wordTransforms = [word1, word2, word3];

  return (
    <section
      ref={ref}
      data-tone="film"
      aria-labelledby="hero-title"
      className="relative bg-night text-paper"
      style={{ height: still ? "100svh" : "360svh" }}
    >
      <h1 id="hero-title" className="sr-only">
        Prathamesh Resorts, Khed Shivapur. Breathe, relax, enjoy.
      </h1>

      <div className="sticky top-0 h-svh overflow-hidden">
        {/* Scene one: the film */}
        <motion.div className="absolute inset-0" style={still ? undefined : { scale: scale1 }}>
          <div className="hero-settle absolute inset-0">
            <VideoLoop
              {...film}
              poster={photos.valley}
              portraitPoster={photos.valleyM}
              alt="The resort among trees in a green valley, the Sahyadri hills behind it under monsoon cloud"
              sizes="100vw"
              priority
              active={filmActive}
            />
          </div>
        </motion.div>

        {/* Scenes two and three open through an arch that rises and widens. */}
        {!still && later && (
          <>
            <motion.div className="scene-arch absolute inset-0" style={{ "--p": open2 } as MotionStyle}>
              <motion.div className="absolute inset-0" style={{ scale: scale2 }}>
                <Image
                  src={photos.poolAbove}
                  alt="A wave-patterned pool seen from straight above, closed in by dense green trees"
                  fill
                  sizes="100vw"
                  quality={75}
                  className="object-cover"
                />
              </motion.div>
            </motion.div>
            <motion.div className="scene-arch absolute inset-0" style={{ "--p": open3 } as MotionStyle}>
              <motion.div className="absolute inset-0" style={{ scale: scale3 }}>
                <Image
                  src={photos.waterfallAbove}
                  alt="A rock waterfall spilling into a turquoise pool with water slides, seen from above"
                  fill
                  sizes="100vw"
                  quality={75}
                  className="object-cover object-[42%_50%]"
                />
              </motion.div>
            </motion.div>
          </>
        )}

        {/* Shade under the words, so they read over any frame. */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-night/80 via-night/25 to-transparent" />

        {/* The word for this scene */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-[calc(4.5rem+12svh)] px-5 md:bottom-[calc(5rem+5svh)] md:px-10"
        >
          <div className="relative mx-auto max-w-[1680px]">
            <div className="relative overflow-clip pb-[0.06em] text-[clamp(4.6rem,22vw,8rem)] leading-[0.86] md:text-[clamp(6rem,15.5vw,17rem)]">
              {scenes.map((s, i) => (
                <motion.p
                  key={s.word}
                  className={`display ${i === 0 ? "relative" : "absolute inset-x-0 top-0"}`}
                  style={still ? (i === 0 ? undefined : { display: "none" }) : { transform: wordTransforms[i] }}
                >
                  <span className={`block ${i === 0 ? "hero-word" : ""}`}>{s.word}</span>
                </motion.p>
              ))}
            </div>
          </div>
        </div>

        {/* What, where, and the one action, while the film is up */}
        <motion.div
          className="absolute inset-x-0 bottom-[calc(4.5rem+2svh)] px-5 md:bottom-[calc(5rem+6.5svh)] md:px-10"
          style={still ? undefined : { opacity: introOpacity }}
        >
          <div className="mx-auto flex max-w-[1680px] md:justify-end">
            <div className="hero-fade max-w-[22rem] md:max-w-[19rem]" style={{ "--i": 0 } as React.CSSProperties}>
              <p className="text-[0.98rem] leading-snug text-paper/90">
                A green valley resort at the foot of the Sahyadri, near Khed Shivapur, just south of Pune.
              </p>
              {/* Two ways in: stay the weekend, or come for the day. */}
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                <a href="#enquire" tabIndex={-1} className="btn btn-paper hidden md:inline-flex">
                  <Roll>Plan your stay</Roll>
                </a>
                <Link href="/experiences#day" className="link-line text-[0.95rem] text-paper">
                  Or come for the day
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Scene index, caption, coordinates */}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5 md:px-10 md:pb-7">
          <div className="hero-fade mx-auto flex max-w-[1680px] items-end justify-between gap-6 border-t border-paper/20 pt-4" style={{ "--i": 1 } as React.CSSProperties}>
            <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-8">
              <p className="label shrink-0 tabular-nums text-paper">
                0{scene + 1} <span className="text-paper/50">/ 03</span>
              </p>
              {!still && (
                <span aria-hidden className="relative hidden h-px w-24 shrink-0 bg-paper/20 md:block">
                  <motion.span className="absolute inset-0 origin-left bg-paper" style={{ transform: progress }} />
                </span>
              )}
              <p className="relative min-w-0 flex-1 text-[0.85rem] text-paper/80 md:text-[0.9rem]">
                {scenes.map((s, i) => (
                  <span
                    key={s.caption}
                    className={`block truncate transition-opacity duration-700 ${i === 0 ? "" : "absolute inset-0"} ${
                      scene === i ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {s.caption}
                  </span>
                ))}
              </p>
            </div>
            <div className="hidden shrink-0 items-center gap-8 md:flex">
              <p className="label text-paper/70">18°17′ N, 73°51′ E</p>
              {!still && (
                <p className="label flex items-center gap-3 text-paper/70">
                  Scroll
                  <span aria-hidden className="relative block h-7 w-px overflow-hidden bg-paper/20">
                    <span className="scroll-cue absolute inset-0 bg-paper" />
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

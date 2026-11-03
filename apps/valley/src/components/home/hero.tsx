"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { contact, dms } from "@/content/resort";
import { photos } from "@/content/photos";
import { VideoLoop } from "../video-loop";

/*
 * A large-letter postcard, the kind every hill station once sold: the
 * place name in huge letters with the view inside them. The view here is
 * the resort's own drone film of 3 August 2026, over the cottages and
 * toward the hills. Scrolling walks you through the card and into the view.
 */
const film = {
  sources: { av1: "/video/hills.av1.mp4", hevc: "/video/hills.hevc.mp4" },
  portraitSources: { av1: "/video/hills-m.av1.mp4", hevc: "/video/hills-m.hevc.mp4" },
};

const filmAlt = "The resort from the air: grey roofs and red laterite walls in rows, green fields around them and the hills behind";

// The word's size, shared by the card and the lettering layer so the two stay aligned.
const wordSize = "text-[clamp(6rem,28vw,32rem)] md:text-[clamp(6rem,25vw,32rem)]";

// Slow at first, then faster, like stepping toward the card and through it.
const easeIn = (t: number) => t * t * t;

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const still = Boolean(reduce);
  const [throughCard, setThroughCard] = useState(false);
  const [cardGone, setCardGone] = useState(false);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const cardScale = useTransform(scrollYProgress, [0, 0.62], [1, 5.5], { ease: easeIn });
  const cardOpacity = useTransform(scrollYProgress, [0.28, 0.6], [1, 0]);
  const detailOpacity = useTransform(scrollYProgress, [0.02, 0.2], [1, 0]);
  const filmScale = useTransform(scrollYProgress, [0, 0.7], [1.16, 1]);
  const captionOpacity = useTransform(scrollYProgress, [0.55, 0.75], [0, 1]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setThroughCard(v > 0.42);
    // Once the card has faded, take it out, so the browser stops blending it over the film.
    setCardGone(v > 0.62);
  });

  const { lat, lng } = contact.geo;

  return (
    <section
      ref={ref}
      data-tone={still || throughCard ? "film" : "card"}
      aria-labelledby="hero-title"
      className="relative bg-ink text-mist"
      style={{ height: still ? "100svh" : "230svh" }}
    >
      <h1 id="hero-title" className="sr-only">
        Prathamesh Valley Resorts, Bhilar, Mahabaleshwar annex. A hill-station holiday in the Western Ghats.
      </h1>

      <div className="sticky top-0 h-svh overflow-hidden">
        {/* The film, settling as the card falls away. */}
        <motion.div className="absolute inset-0" style={still ? undefined : { scale: filmScale }}>
          <VideoLoop {...film} poster={photos.heroHills} portraitPoster={photos.heroHillsM} alt={filmAlt} sizes="100vw" priority />
        </motion.div>

        {/* Mist drifting across the hills, two banks at two speeds. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="mist-layer top-[4%] h-[46%] opacity-45 [--drift:150s]" />
          <div className="mist-layer top-[38%] h-[52%] opacity-25 [--drift:100s]" />
        </div>
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-night/75 via-night/25 to-transparent" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-night/40 to-transparent" />

        {/* What the film shows, once the card has gone (and the whole hero, for reduced motion). */}
        <motion.div
          className="absolute inset-x-0 bottom-0 px-5 pb-6 md:px-10 md:pb-9"
          style={still ? undefined : { opacity: captionOpacity }}
          // Under the card these links are invisible, so keep them out of reach until it has gone.
          inert={!still && !throughCard}
        >
          <div className="mx-auto max-w-[1600px]">
            {still ? (
              <p className="display mb-8 text-[clamp(3.6rem,13vw,11rem)] leading-[0.9] [--em-color:var(--color-clay)]">
                <em className="block text-[0.32em] leading-none">Greetings from</em>
                Bhilar
              </p>
            ) : (
              // Through the postcard and into the place it came from.
              <p className="display mb-8 text-[clamp(2.8rem,6.4vw,6.6rem)] leading-[0.95] [--em-color:var(--color-clay)]">
                Welcome to the <em>hills.</em>
              </p>
            )}
            <div className="grid gap-6 border-t border-mist/25 pt-5 md:grid-cols-12 md:items-end">
              <p className="max-w-md text-[1rem] leading-snug text-mist/90 md:col-span-6">
                Cottages of red laterite stone among the fields of Bhilar, between Panchgani and Mahabaleshwar.
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:col-span-6 md:justify-end">
                <p className="label hidden text-mist/75 lg:block">
                  {dms(lat)} N · {dms(lng)} E
                </p>
                <Link href="/stays" className="arrow-link text-[0.95rem] text-mist">
                  See the cottages
                </Link>
                <Link href="/stays#book" className="btn btn-mist">
                  Book a stay <span aria-hidden className="btn-arrow">→</span>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {!still && !cardGone && (
          <>
            {/* The card. Screen blending keeps its mist colour and lets the film show through the black letters. */}
            <motion.div
              aria-hidden
              className="postcard-card absolute inset-0 grid place-items-center pt-[6svh]"
              style={{ scale: cardScale, opacity: cardOpacity }}
            >
              <p className={`postcard-word postcard-in ${wordSize}`}>Bhilar</p>
            </motion.div>

            {/* The card's lettering and edges, in a normal layer above it that zooms with it. */}
            <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ scale: cardScale, opacity: detailOpacity }}>
              <div className="absolute inset-2 border border-ink/15 md:inset-3" />
              <div className="grid h-full place-items-center pt-[6svh]">
                <div className="relative">
                  <p className={`postcard-word invisible ${wordSize}`}>Bhilar</p>
                  <p
                    className="fade-in display absolute bottom-[calc(100%+0.1em)] left-[0.04em] whitespace-nowrap text-[clamp(1.9rem,4.4vw,4.8rem)] leading-none text-laterite"
                  >
                    <em>Greetings from</em>
                  </p>
                  <div
                    className="fade-in absolute inset-x-0 top-[calc(100%+1.6rem)] flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-ink"
                    style={{ "--i": 1 } as React.CSSProperties}
                  >
                    <p className="label">Prathamesh Valley Resorts</p>
                    <p className="label text-moss">Mahabaleshwar annex</p>
                  </div>
                </div>
              </div>
              <div className="fade-in absolute inset-x-0 bottom-0 px-6 pb-7 md:px-12 md:pb-10" style={{ "--i": 2 } as React.CSSProperties}>
                <div className="mx-auto flex max-w-[1600px] items-end justify-between gap-6 text-ink">
                  <p className="label max-w-[16rem] text-moss">
                    {dms(lat)} N, {dms(lng)} E
                    <span className="block">{contact.elevation} above the sea</span>
                  </p>
                  <p className="label flex items-center gap-3 text-moss">
                    Scroll
                    <span aria-hidden className="relative block h-7 w-px overflow-hidden bg-ink/15">
                      <span className="scroll-cue absolute inset-0 bg-ink" />
                    </span>
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
}

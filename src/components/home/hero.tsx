"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform, type MotionStyle } from "motion/react";
import { photos } from "@/content/photos";

/**
 * The arch. A wada-style arched window onto the pool. Scrolling opens the
 * arch to a full-bleed photograph while "Come, breathe." parts to either
 * side, and the second half of the brand line, "relax, enjoy.", appears
 * once you are through it.
 */
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  // The arch opens only once its photo is fully loaded and decoded, so a slow
  // phone connection never sees a blank block or a half-drawn image open up.
  // A safety timer opens it anyway if the photo is very slow.
  const [photoReady, setPhotoReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setPhotoReady(true), 3500);
    return () => clearTimeout(timer);
  }, []);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const open = useTransform(scrollYProgress, [0, 0.62], [0, 1]);
  const outlineOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0]);
  const imageScale = useTransform(scrollYProgress, [0, 0.75], [1.16, 1]);
  const leftX = useTransform(scrollYProgress, [0, 0.55], [0, -38]);
  const rightX = useTransform(scrollYProgress, [0, 0.55], [0, 38]);
  const wordsOpacity = useTransform(scrollYProgress, [0.05, 0.4], [1, 0]);
  const introOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0]);
  const endOpacity = useTransform(scrollYProgress, [0.62, 0.82], [0, 1]);
  // While the arch opens, the Sahyadri gives way to the resort itself.
  const resortOpacity = useTransform(scrollYProgress, [0.08, 0.4], [0, 1]);
  const endY = useTransform(scrollYProgress, [0.62, 0.9], [40, 0]);

  const imageTransform = useMotionTemplate`scale(${imageScale})`;
  const leftTransform = useMotionTemplate`translate3d(${leftX}vw, 0, 0)`;
  const rightTransform = useMotionTemplate`translate3d(${rightX}vw, 0, 0)`;
  const endTransform = useMotionTemplate`translate3d(0, ${endY}px, 0)`;

  const still = Boolean(reduce);

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      data-ready={photoReady ? "" : undefined}
      className="hero relative bg-mist"
      style={{ height: still ? "100svh" : "280svh" }}
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* The arch */}
        <motion.div
          className="hero-window absolute inset-0"
          style={(still ? {} : { "--open": open }) as MotionStyle}
        >
          <div className="hero-fill absolute inset-0">
            <motion.div className="absolute inset-0" style={still ? undefined : { transform: imageTransform }}>
              <div className="hero-settle absolute inset-0">
                {/*
                  The landscape around the resort, not the resort itself: mist on the
                  Sahyadri at Varandha Ghat, in Bhor taluka, during the monsoon.
                  Photo by Satyan Chawla, free under the Unsplash License:
                  https://unsplash.com/photos/green-trees-on-mountain-during-foggy-day-PTI5yH3A4l8
                  Credited in the site footer.
                */}
                <Image
                  src={photos.heroSahyadri}
                  alt="Mist over the green slopes of the Sahyadri at Varandha Ghat, near Bhor, in the monsoon"
                  fill
                  preload
                  sizes="100vw"
                  placeholder="blur"
                  className="object-cover object-[66%_50%]"
                  onLoad={(event) => {
                    event.currentTarget
                      .decode()
                      .catch(() => {})
                      .finally(() => setPhotoReady(true));
                  }}
                />
                {/*
                  Through the arch: the resort. A Glass House balcony at Prathamesh.
                  Mounted only after the first photo is ready, so on a slow phone
                  connection it never competes with the opening image.
                */}
                {photoReady && !still && (
                  <motion.div className="absolute inset-0" style={{ opacity: resortOpacity }}>
                    <Image
                      src={photos.glassJacuzzi}
                      alt="A jacuzzi filled with rose petals on a Glass House balcony at Prathamesh Resorts, open to the trees"
                      fill
                      loading="eager"
                      sizes="100vw"
                      className="object-cover object-[28%_60%] md:object-[50%_60%]"
                    />
                  </motion.div>
                )}
              </div>
            </motion.div>
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-moss/90 via-moss/30 to-transparent"
              style={{ opacity: still ? 0 : endOpacity }}
            />
          </div>
        </motion.div>

        {/*
          A hairline outline of the arch. It appears while the photo loads, then
          stays on top of the photo's edge so the curve reads clearly against the
          pale mist, and fades away as soon as the arch starts to open.
        */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ opacity: still ? 1 : outlineOpacity }}
        >
          <div className="hero-outline hero-window-frame absolute" />
        </motion.div>

        {/* "Come, breathe." on either side of the arch */}
        <h1 id="hero-title" className="pointer-events-none absolute inset-0 text-[clamp(3.4rem,13.5vw,6rem)] text-moss md:text-[clamp(4rem,7.3vw,10rem)]">
          <span className="sr-only">Prathamesh Resorts. </span>
          <motion.span
            className="absolute left-5 top-[12svh] block md:left-auto md:right-[calc(64%+2.2vw)] md:top-1/2 md:-mt-[0.6em]"
            style={still ? undefined : { transform: leftTransform, opacity: wordsOpacity }}
          >
            <span className="block overflow-clip pb-[0.08em]">
              <span className="hero-word block" style={{ "--i": 0 } as React.CSSProperties}>
                Come,
              </span>
            </span>
          </motion.span>
          <motion.span
            className="absolute right-5 top-[calc(12svh+0.95em)] block md:left-[calc(64%+2.2vw)] md:right-auto md:top-1/2 md:-mt-[0.6em]"
            style={still ? undefined : { transform: rightTransform, opacity: wordsOpacity }}
          >
            <span className="block overflow-clip pb-[0.08em]">
              <span className="hero-word block" style={{ "--i": 1 } as React.CSSProperties}>
                breathe.
              </span>
            </span>
          </motion.span>
        </h1>

        {/* Where we are, before the arch opens */}
        <motion.div
          className="absolute inset-x-5 bottom-[2.2svh] flex items-end justify-between gap-6 text-[0.9rem] text-fern md:inset-x-10 md:bottom-[2.6svh]"
          style={still ? undefined : { opacity: introOpacity }}
        >
          <p className="hero-fade max-w-[17rem] leading-snug md:max-w-xs" style={{ "--i": 0 } as React.CSSProperties}>
            Prathamesh Resorts, Khed Shivapur, near Pune.
          </p>
          {!still && (
            <p className="hero-fade hidden md:block" style={{ "--i": 1 } as React.CSSProperties}>
              Scroll to step inside
            </p>
          )}
        </motion.div>

        {/* Through the arch: the rest of the line */}
        {!still && (
          <motion.div
            aria-hidden
            className="absolute inset-x-0 bottom-0 px-5 pb-[8svh] text-mist md:px-10 md:pb-[9svh]"
            style={{ opacity: endOpacity, transform: endTransform }}
          >
            <div className="mx-auto flex max-w-[1600px] flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <p className="display text-[clamp(3rem,9vw,8.5rem)] leading-[0.95]">
                relax, enjoy.
              </p>
              <div className="max-w-sm">
                <p className="text-[1.2rem] text-mist">Stay the weekend, or come for the day.</p>
                {/* Same action as the header button, so it stays out of the tab order. */}
                <a href="#enquire" tabIndex={-1} className="btn btn-zari mt-6">
                  Plan your stay
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}

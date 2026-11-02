"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useTransform } from "motion/react";
import { featuredStaySlugs, stays } from "@/content/resort";
import { Photo } from "../photo";
import { InView, RiseLines } from "../in-view";

const featured = featuredStaySlugs.map((slug) => stays.find((s) => s.slug === slug)!);

/**
 * On large screens the section pins and vertical scroll walks the row of
 * stays sideways. On phones it is a plain swipeable row with snap points.
 */
export function StaysRail() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [pinned, setPinned] = useState(false);
  const [distance, setDistance] = useState(0);
  const distanceValue = useMotionValue(0);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setPinned(mq.matches && !reduce);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [reduce]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !pinned) {
      setDistance(0);
      distanceValue.set(0);
      return;
    }
    const measure = () => {
      const d = Math.max(0, track.scrollWidth - window.innerWidth);
      setDistance(d);
      distanceValue.set(d);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pinned, distanceValue]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const x = useTransform(() => -scrollYProgress.get() * distanceValue.get());
  const trackTransform = useMotionTemplate`translate3d(${x}px, 0, 0)`;
  const progressTransform = useMotionTemplate`scaleX(${scrollYProgress})`;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="stays-title"
      className="relative bg-paper"
      style={pinned ? { height: `calc(100svh + ${distance}px)` } : undefined}
    >
      <div className={pinned ? "sticky top-0 flex h-svh items-center overflow-hidden" : "py-24"}>
        <motion.div
          ref={trackRef}
          style={pinned ? { transform: trackTransform } : undefined}
          className={`flex items-start gap-5 px-5 md:gap-8 md:px-10 lg:w-max lg:gap-[3vw] lg:pr-[8vw] ${
            pinned ? "" : "no-scrollbar snap-x snap-mandatory overflow-x-auto scroll-px-5"
          }`}
        >
          <InView className="flex w-[82vw] shrink-0 snap-start flex-col justify-start sm:w-[55vw] lg:w-[30vw] lg:justify-between lg:self-stretch lg:pr-[2vw]">
            <div>
              <h2 id="stays-title" className="text-[clamp(3rem,6.4vw,7rem)]">
                <RiseLines lines={["Ten ways", "to stay"]} />
              </h2>
              <p className="fade mt-8 max-w-sm text-fern">
                Every stay has air conditioning, its own bathroom and meals from our kitchens. Choose the setting: glass
                and water, canvas, laterite stone or warm timber.
              </p>
            </div>
            <Link href="/stays" className="fade link-line mt-10 self-start text-[1.05rem]" style={{ "--i": 2 } as React.CSSProperties}>
              See every stay and its rates
            </Link>
          </InView>

          {featured.map((stay, i) => (
            <Link
              key={stay.slug}
              href={`/stays#${stay.slug}`}
              className={`zoom-on-hover group block w-[78vw] shrink-0 snap-start sm:w-[46vw] lg:w-[25vw] ${
                i % 2 === 1 ? "lg:mt-[9svh]" : ""
              }`}
            >
              <Photo
                name={stay.cover ?? stay.photos[0]}
                alt=""
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 46vw, 78vw"
                className="aspect-[4/5] lg:aspect-auto lg:h-[56svh]"
              />
              <div className="mt-5 flex items-baseline justify-between gap-4">
                <h3 className="text-[clamp(1.6rem,2.1vw,2.2rem)] leading-tight">{stay.name}</h3>
              </div>
              <p className="mt-2 max-w-[34ch] text-[0.95rem] text-fern">{stay.line}</p>
              <p className="mt-3 text-[0.9rem] text-moss/80">
                {stay.rooms}, for {stay.guests}
              </p>
            </Link>
          ))}

          <Link
            href="/stays"
            className="group flex w-[60vw] shrink-0 snap-start flex-col justify-center self-stretch sm:w-[36vw] lg:w-[18vw]"
          >
            <span className="display text-[clamp(2rem,3vw,3.2rem)] leading-tight">And four more</span>
            <span className="mt-3 text-fern group-hover:text-moss">Cozy cottages, standard rooms and houses for groups</span>
          </Link>
        </motion.div>

        {pinned && (
          <div aria-hidden className="absolute inset-x-10 bottom-8 h-px bg-moss/10">
            <motion.div className="h-full origin-left bg-moss" style={{ transform: progressTransform }} />
          </div>
        )}
      </div>
    </section>
  );
}

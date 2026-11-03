"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useTransform } from "motion/react";
import { featuredStaySlugs, formatRupees, stays, type Stay } from "@/content/resort";
import { Photo } from "../photo";
import { InView, RiseLines } from "../in-view";

const featured = featuredStaySlugs.map((slug) => stays.find((s) => s.slug === slug)!);

/** The lowest published rate for a stay, with what it covers. */
function fromRate(stay: Stay) {
  const plan = stay.weekday ?? stay.everyDay!;
  return { amount: formatRupees(plan.base), basis: plan.basis };
}

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
      data-tone="dark"
      aria-labelledby="stays-title"
      className="relative bg-forest text-paper"
      style={pinned ? { height: `calc(100svh + ${distance}px)` } : undefined}
    >
      <div className={pinned ? "sticky top-0 flex h-svh items-center overflow-hidden" : "py-24"}>
        <motion.div
          ref={trackRef}
          style={pinned ? { transform: trackTransform } : undefined}
          className={`flex items-start gap-5 px-5 md:gap-8 md:px-10 lg:w-max lg:gap-[3vw] lg:pr-[8vw] lg:pt-10 ${
            pinned ? "" : "no-scrollbar snap-x snap-mandatory overflow-x-auto scroll-px-5"
          }`}
        >
          <InView className="flex w-[82vw] shrink-0 snap-start flex-col justify-start sm:w-[55vw] lg:w-[31vw] lg:justify-between lg:self-stretch lg:pr-[2vw]">
            <div>
              <p className="fade label text-sage">02 · Stays</p>
              <h2 id="stays-title" className="mt-8 text-[clamp(3.2rem,6.6vw,7.4rem)]">
                <RiseLines lines={["Ten ways", "to stay"]} />
              </h2>
              <p className="fade mt-8 max-w-sm text-sage" style={{ "--i": 1 } as React.CSSProperties}>
                Glass and water, canvas, red laterite stone or warm timber. Every stay has air conditioning, its own
                bathroom and meals from our kitchens.
              </p>
            </div>
            <Link href="/stays" className="fade link-line mt-10 self-start text-[1rem]" style={{ "--i": 2 } as React.CSSProperties}>
              Every stay and its rates
            </Link>
          </InView>

          {featured.map((stay, i) => {
            const rate = fromRate(stay);
            return (
              <Link
                key={stay.slug}
                href={`/stays#${stay.slug}`}
                data-cursor="View"
                className={`zoom-on-hover group block w-[78vw] shrink-0 snap-start sm:w-[46vw] lg:w-[24vw] ${
                  i % 2 === 1 ? "lg:mt-[10svh]" : ""
                }`}
              >
                <div className="flex items-baseline justify-between pb-4">
                  <span className="label text-sage">{String(i + 1).padStart(2, "0")}</span>
                  <span className="label text-sage">{stay.rooms}</span>
                </div>
                <Photo
                  name={stay.cover ?? stay.photos[0]}
                  alt=""
                  sizes="(min-width: 1024px) 24vw, (min-width: 640px) 46vw, 78vw"
                  className="aspect-[4/5] lg:aspect-auto lg:h-[54svh]"
                />
                <h3 className="mt-5 text-[clamp(1.7rem,2.1vw,2.3rem)] leading-tight">{stay.name}</h3>
                <p className="mt-2 max-w-[32ch] text-[0.95rem] leading-snug text-sage">{stay.line}</p>
                <p className="mt-4 flex items-baseline gap-2 border-t border-paper/15 pt-4 text-[0.9rem] text-sage">
                  From <span className="display text-[1.6rem] leading-none text-paper">{rate.amount}</span> {rate.basis}
                </p>
              </Link>
            );
          })}

          <Link
            href="/stays"
            className="group flex w-[60vw] shrink-0 snap-start flex-col justify-center self-stretch sm:w-[36vw] lg:w-[18vw]"
          >
            <span className="display text-[clamp(2.2rem,3.2vw,3.4rem)] leading-tight">
              And four <em>more</em>
            </span>
            <span className="mt-4 max-w-[24ch] text-sage transition-colors group-hover:text-paper">
              Cozy cottages, standard rooms and houses for groups
            </span>
          </Link>
        </motion.div>

        {pinned && (
          <div aria-hidden className="absolute inset-x-10 bottom-8 h-px bg-paper/15">
            <motion.div className="h-full origin-left bg-sun" style={{ transform: progressTransform }} />
          </div>
        )}
      </div>
    </section>
  );
}

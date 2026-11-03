"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { cap, experienceGroups, listLine } from "@/content/resort";
import { photos } from "@/content/photos";
import { Photo } from "../photo";
import { InView, RiseLines } from "../in-view";

const everything = experienceGroups.flatMap((g) => g.items);

/**
 * An index of what there is to do. With a mouse, a photo of the hovered
 * row trails the pointer. On touch screens each row carries its own thumbnail.
 */
export function ExperienceIndex() {
  const listRef = useRef<HTMLUListElement>(null);
  const reduce = useReducedMotion();
  const [finePointer, setFinePointer] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const spring = { stiffness: 170, damping: 24, mass: 0.6 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);
  const follow = useMotionTemplate`translate3d(${sx}px, ${sy}px, 0)`;

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFinePointer(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const showFollower = finePointer && !reduce;

  return (
    <section aria-labelledby="experiences-title" className="overflow-hidden bg-linen">
      {/* Every activity by name, drifting past. */}
      <div aria-hidden className="border-b border-forest/12 py-5">
        <div className="marquee flex w-max">
          {[0, 1].map((copy) => (
            <p key={copy} className="display flex shrink-0 items-center whitespace-nowrap text-[1.6rem] italic text-fern md:text-[2rem]">
              {everything.map((item) => (
                <span key={item} className="flex items-center">
                  <span className="px-6">{cap(item)}</span>
                  <span className="size-1.5 rounded-full bg-sun" />
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1680px] px-5 py-24 md:px-10 md:py-36">
        <InView className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="fade label text-fern">04 · Experiences</p>
            <h2 id="experiences-title" className="mt-8 text-[clamp(3rem,6.4vw,7rem)]">
              <RiseLines lines={["More than eighty", "ways to spend a day"]} />
            </h2>
          </div>
          <p className="fade max-w-sm self-end text-fern lg:col-span-4" style={{ "--i": 2 } as React.CSSProperties}>
            Every stay and every day package includes the games and activities, from the zip line to the carrom board.
          </p>
        </InView>

        <ul
          ref={listRef}
          className="relative mt-16 border-b border-forest/15 md:mt-24"
          onPointerMove={(event) => {
            if (!showFollower || !listRef.current) return;
            const box = listRef.current.getBoundingClientRect();
            x.set(event.clientX - box.left);
            y.set(event.clientY - box.top);
          }}
          onPointerLeave={() => setActive(null)}
        >
          {experienceGroups.map((group, i) => (
            <li key={group.id} className="border-t border-forest/15">
              <Link
                href={`/experiences#${group.id}`}
                onPointerEnter={() => setActive(group.id)}
                onFocus={() => setActive(group.id)}
                onBlur={() => setActive(null)}
                className={`group grid grid-cols-[auto_1fr_auto] items-center gap-x-5 gap-y-3 py-7 transition-colors duration-300 md:grid-cols-12 md:py-9 ${
                  active && active !== group.id ? "md:text-forest/45" : ""
                }`}
              >
                <span className="label self-start pt-[0.6em] text-fern md:col-span-1 md:self-center md:pt-0">0{i + 1}</span>
                <span className="display text-[clamp(2.2rem,5.2vw,5.4rem)] leading-none transition-transform duration-500 ease-out md:col-span-6 md:group-hover:translate-x-4">
                  {group.title}
                </span>
                <span className="col-span-2 col-start-2 row-start-2 text-[0.95rem] text-fern md:col-span-4 md:col-start-8 md:row-start-1">
                  {listLine(group.items)}
                </span>
                <Photo name={group.cover} alt="" sizes="96px" className="row-span-1 aspect-square w-16 md:hidden" />
                <span
                  aria-hidden
                  className="hidden justify-self-end text-[1.4rem] transition-transform duration-500 ease-out md:col-span-1 md:block md:group-hover:translate-x-1"
                >
                  &rarr;
                </span>
              </Link>
            </li>
          ))}

          {showFollower && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 z-10 hidden md:block"
              style={{ transform: follow }}
            >
              <div
                className={`-translate-x-1/2 -translate-y-1/2 transition-[opacity,scale] duration-500 ease-out ${
                  active ? "scale-100 opacity-100" : "scale-[0.9] opacity-0"
                }`}
              >
                <div className="arch relative aspect-[3/4] w-[19vw] max-w-[300px] overflow-hidden bg-canopy">
                  {experienceGroups.map((group) => (
                    <Image
                      key={group.id}
                      src={photos[group.cover]}
                      alt=""
                      fill
                      sizes="300px"
                      className={`object-cover transition-opacity duration-500 ${active === group.id ? "opacity-100" : "opacity-0"}`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </ul>

        <div className="mt-12 flex justify-end">
          <Link href="/experiences" className="link-line">
            Every activity, with photos
          </Link>
        </div>
      </div>
    </section>
  );
}

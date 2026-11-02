"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { experienceGroups, listLine } from "@/content/resort";
import { photos } from "@/content/photos";
import { Photo } from "../photo";
import { InView, RiseLines } from "../in-view";

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
    <section aria-labelledby="experiences-title" className="bg-mist">
      <div className="mx-auto max-w-[1600px] px-5 py-24 md:px-10 md:py-40">
        <InView className="grid gap-8 lg:grid-cols-12">
          <h2 id="experiences-title" className="text-[clamp(2.8rem,6vw,6.4rem)] lg:col-span-8">
            <RiseLines lines={["More than eighty", "ways to spend a day"]} />
          </h2>
          <p className="fade max-w-sm self-end text-fern lg:col-span-4">
            Every stay and every day package includes the games and activities, from the zip line to the carrom
            board.
          </p>
        </InView>

        <ul
          ref={listRef}
          className="relative mt-16 border-b border-moss/15 md:mt-24"
          onPointerMove={(event) => {
            if (!showFollower || !listRef.current) return;
            const box = listRef.current.getBoundingClientRect();
            x.set(event.clientX - box.left);
            y.set(event.clientY - box.top);
          }}
          onPointerLeave={() => setActive(null)}
        >
          {experienceGroups.map((group) => (
            <li key={group.id} className="border-t border-moss/15">
              <Link
                href={`/experiences#${group.id}`}
                onPointerEnter={() => setActive(group.id)}
                onFocus={() => setActive(group.id)}
                onBlur={() => setActive(null)}
                className={`group grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 py-7 transition-colors duration-300 md:grid-cols-12 md:py-9 ${
                  active && active !== group.id ? "md:text-moss/60" : ""
                }`}
              >
                <span className="display text-[clamp(2.1rem,5vw,5rem)] leading-none md:col-span-7">{group.title}</span>
                <span className="col-span-2 row-start-2 text-[0.95rem] text-fern md:col-span-4 md:col-start-9 md:row-start-1">
                  {listLine(group.items)}
                </span>
                <Photo
                  name={group.cover}
                  alt=""
                  sizes="96px"
                  className="row-span-1 aspect-square w-20 md:hidden"
                />
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
                  active ? "scale-100 opacity-100" : "scale-[0.92] opacity-0"
                }`}
              >
                <div className="relative aspect-[4/5] w-[19vw] max-w-[300px] overflow-hidden bg-moss-2">
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
            See every activity
          </Link>
        </div>
      </div>
    </section>
  );
}

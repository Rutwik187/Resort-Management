"use client";

import Image from "next/image";
import { Fragment, useState } from "react";
import { photos, type PhotoKey } from "@/content/photos";
import { stays } from "@/content/resort";
import { InView } from "../in-view";

/* The opening sentence. Photos sit inside it, the size of a word. */
const sentence: (string | { photo: PhotoKey; position?: string })[] = [
  "A green valley",
  { photo: "river218", position: "object-[30%_50%]" },
  "at the foot of the Sahyadri,",
  { photo: "valley", position: "object-[50%_15%]" },
  "with glass houses in the river trees,",
  { photo: "glassHouseExterior", position: "object-[50%_62%]" },
  "cottages of red laterite stone",
  { photo: "chiraCottage" },
  "and a pool under the palms.",
  { photo: "poolPalms" },
  "Nothing here asks you to hurry.",
];

const facts = [
  { value: String(stays.length), label: "ways to stay, from glass houses to tents" },
  { value: "80+", label: "activities, included with every stay" },
  { value: "2", label: "kitchens, one pure veg and one non-veg" },
  { value: "4", label: "day packages, for when one day is enough" },
];

/*
 * Places on the 218 m aerial photo, as percentages of its width and height.
 * Only what can be told apart from the air is marked. The Glass Houses were
 * built after this flight, so they are not on it.
 */
const places = [
  { n: 1, name: "The river", note: "Fast and brown in the monsoon, along the whole west side.", x: 23.5, y: 54 },
  { n: 2, name: "The waterfall pool", note: "Rock falls, slides and a mushroom fountain.", x: 35, y: 14 },
  { n: 3, name: "The main pool", note: "Wave-patterned, under a ring of old trees.", x: 36, y: 22 },
  { n: 4, name: "The garden walk", note: "A red path that winds between the lawns.", x: 57, y: 44 },
  { n: 5, name: "Bungalow with private pool", note: "The red roof, with its own pool beside it.", x: 47, y: 75 },
];

export function Intro() {
  const [active, setActive] = useState<number | null>(null);
  let wordIndex = 0;

  return (
    <section aria-labelledby="intro-title" className="bg-paper">
      <div className="mx-auto max-w-[1680px] px-5 pb-24 pt-24 md:px-10 md:pb-36 md:pt-36">
        <InView amount={0.15}>
          <div className="fade flex items-center justify-between gap-6 border-t border-forest/15 pt-5">
            <p className="label text-fern">01 · The valley</p>
            <p className="label text-fern">Salawade, Taluka Bhor</p>
          </div>

          <h2 id="intro-title" className="mt-14 max-w-[24ch] text-[clamp(2.3rem,5.4vw,5.6rem)] leading-[1.04] md:mt-20">
            {sentence.map((part, i) => {
              if (typeof part === "string") {
                return (
                  <Fragment key={i}>
                    {part.split(" ").map((word, j) => (
                      <Fragment key={j}>
                        <span className="rise-word">
                          <span style={{ "--i": wordIndex++ } as React.CSSProperties}>{word}</span>
                        </span>{" "}
                      </Fragment>
                    ))}
                  </Fragment>
                );
              }
              return (
                <Fragment key={i}>
                  <span aria-hidden className="pill" style={{ "--i": wordIndex } as React.CSSProperties}>
                    <Image src={photos[part.photo]} alt="" fill sizes="120px" className={`object-cover ${part.position ?? ""}`} />
                  </span>{" "}
                </Fragment>
              );
            })}
          </h2>
        </InView>

        <InView amount={0.2} className="mt-20 grid gap-12 md:mt-28 lg:grid-cols-12 lg:gap-10">
          <p className="fade max-w-md text-fern lg:col-span-4">
            Stay the weekend in a glass house, a tent or a stone cottage, or come for the day and be home in Pune the
            same night. Every stay includes the games and activities, from the zip line to the carrom board.
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:col-span-7 lg:col-start-6 lg:grid-cols-4">
            {facts.map((f, i) => (
              <div key={f.label} className="fade border-t border-forest/15 pt-5" style={{ "--i": i + 1 } as React.CSSProperties}>
                <dt className="sr-only">{f.label}</dt>
                <dd>
                  <span className="display block text-[clamp(3rem,5vw,4.6rem)] leading-none">{f.value}</span>
                  <span className="mt-3 block max-w-[16ch] text-[0.9rem] leading-snug text-fern">{f.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </InView>

        {/* Figure 1: the whole resort from the air, with the places worth knowing. */}
        <InView as="figure" amount={0.1} className="mt-24 md:mt-36">
          <div className="unveil relative aspect-[4/3] overflow-hidden bg-forest md:aspect-[16/10]">
            <div className="absolute inset-0 md:-top-[10%] md:bottom-[-10%]">
              <Image
                src={photos.river218}
                alt="The resort from 218 metres up: a river on the left, fields on the right, and between them a strip of trees, pools, lawns and roofs"
                fill
                sizes="(min-width: 1680px) 1600px, 100vw"
                className="object-cover"
              />
              {places.map((p) => (
                <button
                  key={p.n}
                  type="button"
                  onPointerEnter={() => setActive(p.n)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(p.n)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(active === p.n ? null : p.n)}
                  aria-label={`${p.n}. ${p.name}`}
                  className="fade absolute -translate-x-1/2 -translate-y-1/2 p-3"
                  style={{ left: `${p.x}%`, top: `${p.y}%`, "--i": 22 + p.n } as React.CSSProperties}
                >
                  <span
                    className={`flex size-8 items-center justify-center rounded-full text-[0.8rem] font-semibold tabular-nums shadow-[0_0_0_6px_rgb(242_239_231/0.25)] transition-[background-color,color,transform] duration-300 ${
                      active === p.n ? "scale-110 bg-sun text-forest" : "bg-paper text-forest"
                    }`}
                  >
                    {p.n}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <figcaption className="mt-6 grid gap-8 md:grid-cols-12 md:gap-10">
            <p className="fade text-[0.95rem] text-fern md:col-span-4">
              <span className="label mr-3 text-forest">Fig. 1</span>
              The resort from 218 m up, photographed by drone on 6 August 2024.
            </p>
            <ol className="fade grid gap-x-8 gap-y-3 text-[0.95rem] sm:grid-cols-2 md:col-span-8 md:grid-cols-3" style={{ "--i": 2 } as React.CSSProperties}>
              {places.map((p) => (
                <li
                  key={p.n}
                  onPointerEnter={() => setActive(p.n)}
                  onPointerLeave={() => setActive(null)}
                  className={`flex gap-3 transition-opacity duration-300 ${active && active !== p.n ? "opacity-45" : "opacity-100"}`}
                >
                  <span className="label mt-[0.2em] w-4 shrink-0 text-sun-deep">{p.n}</span>
                  <span>
                    <span className="block">{p.name}</span>
                    <span className="block text-[0.85rem] leading-snug text-fern">{p.note}</span>
                  </span>
                </li>
              ))}
            </ol>
          </figcaption>
        </InView>
      </div>
    </section>
  );
}

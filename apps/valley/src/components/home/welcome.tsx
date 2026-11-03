"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { contact, cottages } from "@/content/resort";
import { photos } from "@/content/photos";
import { InView, Words } from "../in-view";
import { SectionLabel } from "../section-label";

const facts = [
  { value: String(cottages.length), label: "kinds of AC cottage: classic, with a jacuzzi or with a bath tub" },
  { value: "2", label: "kitchens, one veg and one non-veg, kept apart" },
  { value: "15+", label: "indoor games, with every package" },
  { value: "1 pm", label: `check-in, and check-out at ${contact.checkOut}` },
];

/**
 * Where the resort is and what it offers, then a panorama of Bhilar from the
 * drone. On phones the panorama is wider than the screen and swipes sideways,
 * starting on the resort in the middle.
 */
export function Welcome() {
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    strip.scrollLeft = (strip.scrollWidth - strip.clientWidth) / 2;
  }, []);

  return (
    <section aria-labelledby="welcome-title" className="bg-mist">
      <div className="mx-auto max-w-[1600px] px-5 pb-20 pt-24 md:px-10 md:pb-28 md:pt-36">
        <InView amount={0.15} className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-8">
            <SectionLabel className="fade text-moss">Where we are</SectionLabel>
            <h2 id="welcome-title" className="mt-8 text-[clamp(2.6rem,5.6vw,5.8rem)]">
              <Words text="Mist in the morning, red stone cottages, and the *Western Ghats* on every side." />
            </h2>
          </div>
          <div className="fade self-end lg:col-span-4" style={{ "--i": 2 } as React.CSSProperties}>
            <p className="lead">
              We are on Bhilar–Kaswand Road, ten minutes&apos; drive from Bhilar, in the green country between Panchgani
              and Mahabaleshwar.
            </p>
            <p className="mt-5 text-moss">
              Wake up to mist on the hills, spend the day at the viewpoints with our guide, and come home to a cottage of
              red laterite stone and dinner from our kitchens.
            </p>
          </div>
        </InView>

        <InView as="dl" amount={0.2} className="mt-20 grid grid-cols-2 gap-x-6 gap-y-10 md:mt-28 lg:grid-cols-4">
          {facts.map((f, i) => (
            <div key={f.label} className="fade border-t border-ink/15 pt-5" style={{ "--i": i } as React.CSSProperties}>
              <dt className="sr-only">{f.label}</dt>
              <dd>
                <span className="display block text-[clamp(2.8rem,4.6vw,4.4rem)] leading-none">{f.value}</span>
                <span className="mt-3 block max-w-[20ch] text-[0.92rem] leading-snug text-moss">{f.label}</span>
              </dd>
            </div>
          ))}
        </InView>
      </div>

      <InView as="figure" amount={0.1}>
        <div ref={stripRef} className="no-scrollbar overflow-x-auto md:overflow-visible">
          <div className="lift relative aspect-[3000/840] w-[260vw] md:w-full">
            <Image
              src={photos.panoResort}
              alt="A drone panorama over Bhilar: the resort's grey roofs in the middle, terraced fields and red earth around it, a road curving below and clouds over the hills"
              fill
              sizes="(min-width: 768px) 100vw, 260vw"
              className="object-cover"
            />
          </div>
        </div>
        <figcaption className="mx-auto flex max-w-[1600px] flex-wrap justify-between gap-x-6 gap-y-2 px-5 pt-4 text-[0.9rem] text-moss md:px-10">
          <span>Bhilar from the drone: the resort in the middle, among terraced fields and red earth.</span>
          <span aria-hidden className="label md:hidden">Swipe to look around</span>
        </figcaption>
      </InView>
    </section>
  );
}

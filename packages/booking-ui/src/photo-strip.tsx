"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { Photo } from "./types";

const arrow =
  "absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[1.1rem] text-black shadow-md transition-opacity duration-200 hover:bg-white disabled:opacity-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100";

/** The listing's photos side by side. Swipe on phones; arrows with a mouse. */
export function PhotoStrip({ photos, name, sizes }: { photos: Photo[]; name: string; sizes: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const go = (step: number) => ref.current?.scrollBy({ left: step * ref.current.clientWidth, behavior: "smooth" });

  return (
    <div className="group relative overflow-hidden rounded-bk bg-bk-soft">
      <div
        ref={ref}
        role="region"
        aria-label={`Photos of ${name}`}
        tabIndex={photos.length > 1 ? 0 : undefined}
        onScroll={(event) => setIndex(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, i) => (
          <div key={i} className="relative aspect-[4/3] w-full shrink-0 snap-start">
            <Image src={photo.src} alt={photo.alt} fill sizes={sizes} placeholder="blur" className="object-cover" />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <button type="button" className={`${arrow} left-3`} onClick={() => go(-1)} disabled={index === 0} aria-label="Previous photo">
            <span aria-hidden>←</span>
          </button>
          <button type="button" className={`${arrow} right-3`} onClick={() => go(1)} disabled={index === photos.length - 1} aria-label="Next photo">
            <span aria-hidden>→</span>
          </button>
          <p aria-hidden className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[0.75rem] font-medium tabular-nums text-white">
            {index + 1} / {photos.length}
          </p>
        </>
      )}
    </div>
  );
}

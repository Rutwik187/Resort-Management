"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/*
 * A resort's gallery (URD 4.2, CMS-06): category tabs that staff make in
 * the admin, a grid of photos, and a photo opened full size with its
 * caption. Photos come from the admin's public Vercel Blob store.
 */

export type GalleryPhoto = { id: string; url: string; width: number | null; height: number | null; alt: string; caption: string | null; category: string; featured: boolean };

export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const categories = [...new Set(photos.map((p) => p.category))];
  const [category, setCategory] = useState<string>("All");
  const [open, setOpen] = useState<GalleryPhoto | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const shown = category === "All" ? photos : photos.filter((p) => p.category === category);

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  return (
    <div className="text-bk-ink">
      {categories.length > 1 && (
        <div role="tablist" aria-label="Gallery categories" className="flex flex-wrap gap-2">
          {["All", ...categories].map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={`bk-button min-h-10 rounded-bk-control px-4 ${category === c ? "bg-bk-accent text-bk-accent-ink" : "border border-bk-line hover:border-bk-ink"}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <ul className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {shown.map((photo) => (
          <li key={photo.id} className="mb-4 break-inside-avoid">
            <button type="button" onClick={() => setOpen(photo)} className="group block w-full overflow-hidden rounded-bk text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bk-ink">
              <Image
                src={photo.url}
                alt={photo.alt}
                width={photo.width ?? 1200}
                height={photo.height ?? 900}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </button>
            {photo.caption && <p className="mt-2 text-[0.9rem] text-bk-muted">{photo.caption}</p>}
          </li>
        ))}
      </ul>
      <dialog ref={dialog} onClose={() => setOpen(null)} onClick={(e) => e.target === dialog.current && setOpen(null)} className="m-auto max-h-[92svh] max-w-[min(92vw,1400px)] bg-transparent p-0 backdrop:bg-black/80">
        {open && (
          <figure className="relative">
            <Image src={open.url} alt={open.alt} width={open.width ?? 1600} height={open.height ?? 1200} sizes="92vw" className="h-auto max-h-[85svh] w-auto rounded-bk object-contain" />
            {open.caption && <figcaption className="mt-2 text-center text-white/85">{open.caption}</figcaption>}
            <button type="button" onClick={() => setOpen(null)} aria-label="Close the photo" className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full bg-black/60 text-[1.4rem] text-white">
              ×
            </button>
          </figure>
        )}
      </dialog>
    </div>
  );
}

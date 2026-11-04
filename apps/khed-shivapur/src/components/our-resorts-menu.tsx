"use client";

import { useEffect, useId, useRef, useState } from "react";
import { properties } from "@repo/sites";

/**
 * "Our resorts" in the header: the group's four resorts, each with where it
 * is and what it is known for, so a guest can find the right one in a click.
 */
export function OurResortsMenu({ light }: { light: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className={`flex min-h-11 items-center gap-2 text-[0.9rem] font-medium transition-opacity ${open ? "opacity-100" : "opacity-80 hover:opacity-100"}`}
      >
        Our resorts
        <span aria-hidden className={`text-[0.7rem] transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <div
          id={id}
          className={`absolute right-0 top-full z-50 mt-3 w-[24rem] rounded-[1.25rem] bg-paper p-3 text-forest shadow-[0_30px_80px_-30px_rgb(11_24_19/0.55)] ${
            light ? "" : "ring-1 ring-forest/10"
          }`}
        >
          <p className="label px-3 pb-2 pt-2 text-fern">Four resorts, one family</p>
          <ul>
            {properties.map((property) => {
              const here = property.code === "KS";
              return (
                <li key={property.code}>
                  <a
                    href={here ? "/" : property.url}
                    aria-current={here ? "page" : undefined}
                    className="group block rounded-[0.9rem] px-3 py-3 transition-colors hover:bg-linen"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="display text-[1.35rem] leading-tight">{property.name}</span>
                      {here ? (
                        <span className="label shrink-0 text-sun-deep">You are here</span>
                      ) : (
                        <span aria-hidden className="shrink-0 text-fern transition-transform group-hover:translate-x-1">
                          →
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[0.85rem] text-fern">{property.place}</span>
                    <span className="mt-1 block text-[0.85rem] leading-snug">{property.pitch}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

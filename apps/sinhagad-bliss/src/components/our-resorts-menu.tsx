"use client";

import { useEffect, useId, useRef, useState } from "react";
import { properties } from "@repo/sites";

/**
 * "Our resorts" in the header: the group's four resorts, with where each is
 * and what it is known for, so a guest finds the right one in a click.
 */
export function OurResortsMenu() {
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
        className="kicker flex min-h-11 items-center gap-2 py-3"
      >
        <span className={open ? "opacity-100" : "opacity-75 transition-opacity hover:opacity-100"}>Our resorts</span>
        <span aria-hidden className={`text-[0.6rem] transition-transform duration-500 ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <div id={id} className="absolute right-1/2 top-full z-50 mt-3 w-[25rem] translate-x-1/2 rounded-[4px] bg-mist p-3 text-ink shadow-[0_30px_80px_-30px_rgb(16_22_31/0.6)]">
          <p className="kicker px-3 pb-2 pt-2 text-slate">Four resorts, one family</p>
          <ul>
            {properties.map((property) => {
              const here = property.code === "SB";
              return (
                <li key={property.code}>
                  <a
                    href={here ? "/" : property.url}
                    aria-current={here ? "page" : undefined}
                    className="group block rounded-[3px] px-3 py-3 transition-colors hover:bg-stone"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-[1.3rem] font-light leading-tight">{property.name}</span>
                      {here ? (
                        <span className="kicker shrink-0 text-apricot-deep">You are here</span>
                      ) : (
                        <span aria-hidden className="shrink-0 text-slate transition-transform group-hover:translate-x-1">
                          →
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[0.85rem] text-slate">{property.place}</span>
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

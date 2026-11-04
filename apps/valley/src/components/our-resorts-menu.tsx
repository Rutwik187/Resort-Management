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
        className={`flex min-h-11 items-center gap-2 py-2 text-[0.92rem] font-medium transition-opacity ${open ? "opacity-100" : "opacity-80 hover:opacity-100"}`}
      >
        Our resorts
        <span aria-hidden className={`text-[0.7rem] transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <div id={id} className="absolute right-0 top-full z-50 mt-3 w-[24.5rem] rounded-[6px] bg-mist p-3 text-ink shadow-[0_30px_80px_-30px_rgb(19_29_33/0.6)]">
          <p className="label flex items-center gap-2.5 px-3 pb-2 pt-2 text-moss">
            <span aria-hidden className="size-1.5 rounded-full bg-strawberry" />
            Four resorts, one family
          </p>
          <ul>
            {properties.map((property) => {
              const here = property.code === "PV";
              return (
                <li key={property.code}>
                  <a
                    href={here ? "/" : property.url}
                    aria-current={here ? "page" : undefined}
                    className="group block rounded-[4px] px-3 py-3 transition-colors hover:bg-cloud"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-display text-[1.25rem] font-medium leading-tight">{property.name}</span>
                      {here ? (
                        <span className="label shrink-0 text-laterite">You are here</span>
                      ) : (
                        <span aria-hidden className="shrink-0 text-moss transition-transform group-hover:translate-x-1">
                          →
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[0.85rem] text-moss">{property.place}</span>
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

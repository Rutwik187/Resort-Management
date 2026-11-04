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
        className="flex min-h-11 items-center gap-1.5 py-2 text-[1.02rem] font-bold uppercase tracking-[0.05em] [font-stretch:78%]"
      >
        Our resorts
        <span aria-hidden className={`text-[0.7rem] transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <div id={id} className="absolute right-0 top-full z-50 mt-3 w-[25rem] rounded-[6px] bg-chalk p-3 text-ink shadow-[0_0_0_2px_var(--color-ink),0_30px_80px_-30px_rgb(14_26_20/0.6)]">
          <p className="label px-3 pb-2 pt-2 text-stone">Four resorts, one family</p>
          <ul>
            {properties.map((property) => {
              const here = property.code === "GC";
              return (
                <li key={property.code}>
                  <a
                    href={here ? "/" : property.url}
                    aria-current={here ? "page" : undefined}
                    className="group block rounded-[4px] px-3 py-3 transition-colors hover:bg-bone"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="display text-[1.55rem]">{property.name}</span>
                      {here ? (
                        <span className="label shrink-0 text-brick">You are here</span>
                      ) : (
                        <span aria-hidden className="shrink-0 text-stone transition-transform group-hover:translate-x-1">
                          →
                        </span>
                      )}
                    </span>
                    <span className="mt-1.5 block text-[0.88rem] text-stone">{property.place}</span>
                    <span className="mt-1 block text-[0.88rem] leading-snug">{property.pitch}</span>
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

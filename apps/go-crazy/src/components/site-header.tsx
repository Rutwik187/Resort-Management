"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { contact, nav } from "@/content/resort";
import { OPEN_BOOKING } from "./booking-drawer";
import { Logo } from "./logo";

type Tone = "film" | "dark" | "light" | "top";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

/**
 * What sits under the header right now. Sections mark themselves with
 * data-tone="film" (a photo or film, so the header goes clear with light
 * text) or data-tone="dark" (the header turns pine to match).
 */
function readTone(): Tone {
  const line = 36;
  for (const el of document.querySelectorAll<HTMLElement>("[data-tone]")) {
    const box = el.getBoundingClientRect();
    if (box.top <= line && box.bottom > line) return el.dataset.tone as Tone;
  }
  return window.scrollY > 24 ? "light" : "top";
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tone = useSyncExternalStore(subscribe, readTone, () => "top" as Tone);

  const openMenu = () => {
    dialogRef.current?.showModal();
    setMenuOpen(true);
    document.documentElement.style.overflow = "hidden";
  };
  const closeMenu = () => dialogRef.current?.close();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      setMenuOpen(false);
      document.documentElement.style.overflow = "";
    };
    // The booking drawer takes over from the menu: close the menu without a flash.
    const onBooking = () => {
      if (dialog.open) dialog.close();
    };
    dialog.addEventListener("close", onClose);
    window.addEventListener(OPEN_BOOKING, onBooking);
    return () => {
      dialog.removeEventListener("close", onClose);
      window.removeEventListener(OPEN_BOOKING, onBooking);
    };
  }, []);

  // Close the menu after a route change.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  const light = tone === "film" || tone === "dark";
  const bar =
    tone === "film" || tone === "top"
      ? "bg-transparent"
      : tone === "dark"
        ? "bg-pine shadow-[0_1px_0_rgb(246_245_239/0.12)]"
        : "bg-chalk shadow-[0_1.5px_0_var(--color-ink)]";

  return (
    <>
      <a href="#main" className="btn btn-lime fixed left-4 top-4 z-[90] -translate-y-24 focus-visible:translate-y-0">
        Skip to content
      </a>
      <header
        style={{ viewTransitionName: "site-header" }}
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,color] duration-300 ease-out ${bar} ${
          light ? "text-chalk" : "text-ink"
        }`}
      >
        {/* A soft shade behind the header while it floats over a film, so the links stay readable. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/55 to-transparent transition-opacity duration-300 ${
            tone === "film" ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="relative mx-auto flex h-[68px] max-w-[1600px] items-center justify-between gap-6 px-4 md:h-[78px] md:px-8">
          <Link href="/" aria-label="Prathamesh Go Crazy, home" className="shrink-0">
            <Logo variant="mark" alt="" sizes="(min-width: 768px) 156px, 124px" preload className="w-[124px] md:w-[156px]" />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
            {nav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="group relative py-2 text-[1.02rem] font-bold uppercase tracking-[0.05em] [font-stretch:78%]"
                >
                  {item.label}
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 -bottom-0.5 h-[3px] origin-left bg-lime transition-transform duration-300 ease-out group-hover:scale-x-100 ${
                      active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5">
            <a
              href={contact.phone.href}
              className="mr-3 hidden text-[0.95rem] font-semibold tabular-nums opacity-90 transition-opacity hover:opacity-100 xl:block"
            >
              {contact.phone.display}
            </a>
            <a href="#enquire" className="btn btn-lime min-h-11 px-4 py-2 text-[0.95rem]">
              <span className="sm:hidden">Book</span>
              <span className="hidden sm:inline">Plan a day</span>
              <span aria-hidden className="arrow hidden sm:inline">
                →
              </span>
            </a>
            <button
              type="button"
              onClick={openMenu}
              className="flex min-h-11 items-center gap-2.5 rounded-[3px] pl-2.5 text-[0.95rem] font-bold uppercase tracking-[0.06em] lg:hidden"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-controls="site-menu"
            >
              Menu
              <span aria-hidden className="flex w-6 flex-col gap-[5px]">
                <span className="h-[2px] w-full bg-current" />
                <span className="h-[2px] w-full bg-current" />
                <span className="h-[2px] w-2/3 bg-current" />
              </span>
            </button>
          </div>
        </div>
      </header>

      <dialog
        ref={dialogRef}
        id="site-menu"
        aria-label="Menu"
        className="menu-sheet m-0 h-dvh max-h-none w-full max-w-none bg-pine p-0 text-chalk backdrop:bg-transparent"
        onClick={(event) => {
          const link = event.target instanceof Element ? event.target.closest("a") : null;
          if (link && !link.getAttribute("href")?.startsWith("#")) closeMenu();
        }}
      >
        <div className="flex h-full flex-col overflow-y-auto px-5 pb-8">
          <div className="flex h-[68px] shrink-0 items-center justify-between">
            <Logo variant="mark" alt="Prathamesh Go Crazy" sizes="124px" className="w-[124px]" />
            <button type="button" onClick={closeMenu} className="min-h-11 px-1 text-[0.95rem] font-bold uppercase tracking-[0.06em]">
              Close
            </button>
          </div>
          <nav aria-label="Menu" className="mt-8 flex flex-col border-t border-chalk/15">
            {[{ label: "Home", href: "/" as const }, ...nav].map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)) ? "page" : undefined}
                className="menu-item group flex items-baseline justify-between gap-4 border-b border-chalk/15 py-3.5 aria-[current=page]:text-lime"
                style={{ "--i": i } as React.CSSProperties}
              >
                <span className="display text-[2.7rem] leading-none">{item.label}</span>
                <span className="label text-mist">0{i + 1}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-4 pt-10">
            <a href="#enquire" className="btn btn-lime">
              Plan a day out <span aria-hidden className="arrow">→</span>
            </a>
            <a href={contact.phone.href} className="text-center text-[0.98rem] text-mist">
              Call {contact.phone.display}
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}

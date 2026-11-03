"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLenis } from "lenis/react";
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
 * data-tone="film" (a photo, so the header goes clear with light text) or
 * data-tone="dark" (the header turns dusk blue to match).
 */
function readTone(): Tone {
  const line = 40;
  for (const el of document.querySelectorAll<HTMLElement>("[data-tone]")) {
    const box = el.getBoundingClientRect();
    if (box.top <= line && box.bottom > line) return el.dataset.tone as Tone;
  }
  return window.scrollY > 24 ? "light" : "top";
}

const isActive = (pathname: string, href: string) => !href.includes("#") && pathname.startsWith(href);

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Set when the menu closes because the booking drawer is opening, which then keeps the page still.
  const handingOff = useRef(false);
  const lenis = useLenis();
  const tone = useSyncExternalStore(subscribe, readTone, () => "top" as Tone);

  const openMenu = () => {
    dialogRef.current?.showModal();
    setMenuOpen(true);
    lenis?.stop();
  };
  const closeMenu = () => dialogRef.current?.close();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      setMenuOpen(false);
      if (handingOff.current) handingOff.current = false;
      else lenis?.start();
    };
    const onBooking = () => {
      if (!dialog.open) return;
      handingOff.current = true;
      dialog.close();
    };
    dialog.addEventListener("close", onClose);
    window.addEventListener(OPEN_BOOKING, onBooking);
    return () => {
      dialog.removeEventListener("close", onClose);
      window.removeEventListener(OPEN_BOOKING, onBooking);
    };
  }, [lenis]);

  // Close the menu after a route change.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  const light = tone === "film" || tone === "dark";
  const bar =
    tone === "film" || tone === "top"
      ? "bg-transparent"
      : tone === "dark"
        ? "bg-dusk/95 shadow-[0_1px_0_rgb(241_240_236/0.08)] backdrop-blur-md"
        : "bg-mist/92 shadow-[0_1px_0_rgb(30_38_50/0.08)] backdrop-blur-md";

  return (
    <>
      <a href="#main" className="btn btn-ink fixed left-4 top-4 z-[90] -translate-y-24 focus-visible:translate-y-0">
        Skip to content
      </a>
      <header
        style={{ viewTransitionName: "site-header" }}
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,color] duration-500 ease-out ${bar} ${
          light ? "text-mist" : "text-ink"
        }`}
      >
        {/* A soft shade behind the header while it floats over a photo, so the links stay readable. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-night/50 to-transparent transition-opacity duration-500 ${
            tone === "film" ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="relative mx-auto grid h-[68px] max-w-[1560px] grid-cols-[1fr_auto] items-center gap-6 px-5 md:h-[84px] md:px-10 lg:grid-cols-[1fr_auto_1fr]">
          <Link href="/" aria-label="Sinhagad Bliss, home" className="w-fit shrink-0">
            <Logo variant="mark" alt="" sizes="(min-width: 768px) 128px, 100px" className="w-[100px] md:w-[128px]" />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-10 lg:flex">
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="kicker group relative py-3 transition-opacity duration-300"
                >
                  <span className={active ? "opacity-100" : "opacity-75 transition-opacity group-hover:opacity-100"}>{item.label}</span>
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 bottom-1.5 h-px origin-center bg-current transition-transform duration-700 ease-out ${
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center justify-end gap-3">
            <a
              href={contact.phone.href}
              className="hidden text-[0.92rem] tabular-nums opacity-80 transition-opacity hover:opacity-100 xl:block"
            >
              {contact.phone.display}
            </a>
            <a
              href="#enquire"
              className={`btn min-h-11 px-4 sm:px-5 ${light ? "btn-mist" : "btn-ink"} xl:ml-5`}
            >
              <span className="sm:hidden">Book</span>
              <span className="hidden sm:inline">Plan your stay</span>
            </a>
            <button
              type="button"
              onClick={openMenu}
              className="kicker flex min-h-11 items-center gap-3 pl-2 lg:hidden"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-controls="site-menu"
            >
              Menu
              <span aria-hidden className="flex w-6 flex-col gap-1.5">
                <span className="h-px w-full bg-current" />
                <span className="h-px w-full bg-current" />
              </span>
            </button>
          </div>
        </div>
      </header>

      <dialog
        ref={dialogRef}
        id="site-menu"
        aria-label="Menu"
        className="menu-sheet m-0 h-dvh max-h-none w-full max-w-none bg-dusk p-0 text-mist backdrop:bg-transparent"
        onClick={(event) => {
          const link = event.target instanceof Element ? event.target.closest("a") : null;
          if (!link) return;
          const href = link.getAttribute("href") ?? "";
          closeMenu();
          // In-page links: scroll once smooth scrolling has resumed, so the jump is not swallowed.
          if (href.startsWith("#") && href !== "#enquire") {
            event.preventDefault();
            requestAnimationFrame(() => {
              if (lenis) lenis.scrollTo(href, { offset: 0 });
              else document.querySelector(href)?.scrollIntoView();
            });
          }
        }}
      >
        <div className="relative flex h-full flex-col overflow-hidden px-5 pb-8">
          <div className="flex h-[68px] items-center justify-between">
            <Logo variant="mark" alt="Sinhagad Bliss" sizes="100px" className="w-[100px]" />
            <button type="button" onClick={closeMenu} className="kicker min-h-11 px-1">
              Close
            </button>
          </div>
          <nav aria-label="Menu" className="mt-14 flex flex-col items-center gap-2 text-center">
            {[{ label: "Home", href: "/" as const }, ...nav].map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className="menu-item display flex min-h-14 items-center text-[2.6rem] leading-none"
                style={{ "--i": i } as React.CSSProperties}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/policies"
              className="menu-item kicker mt-6 flex min-h-11 items-center text-haze"
              style={{ "--i": nav.length + 1 } as React.CSSProperties}
            >
              Policies
            </Link>
          </nav>

          {/* The sun from the logo, setting on a thin horizon. */}
          <div aria-hidden className="relative mx-auto mt-auto h-12 w-40 overflow-hidden">
            <span className="sun absolute left-1/2 top-3 size-14 -translate-x-1/2" />
            <span className="absolute inset-x-0 bottom-0 h-px bg-mist/30" />
          </div>
          <div className="mt-8 flex flex-col gap-4">
            <a href="#enquire" className="btn btn-apricot">
              Plan your stay
            </a>
            <a href={contact.phone.href} className="text-center text-[0.95rem] text-haze">
              Call {contact.phone.display}
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}

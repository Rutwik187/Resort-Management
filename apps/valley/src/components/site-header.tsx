"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLenis } from "lenis/react";
import { otherProperties } from "@repo/sites";
import { contact, nav } from "@/content/resort";
import { photos } from "@/content/photos";
import { OPEN_BOOKING } from "./booking-drawer";
import { Logo } from "./logo";
import { OurResortsMenu } from "./our-resorts-menu";

type Tone = "film" | "card" | "dark" | "light" | "top";

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
 * data-tone: "film" (a film or photo, so the header goes clear with light
 * text), "card" (the opening postcard, clear with dark text) or "dark"
 * (the header turns ink to match).
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
  // Set when the menu closes because the booking drawer is opening, which then keeps the page still.
  const handingOff = useRef(false);
  const lenis = useLenis();
  const tone = useSyncExternalStore(subscribe, readTone, () => "card" as Tone);

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
    tone === "film" || tone === "top" || tone === "card"
      ? "bg-transparent"
      : tone === "dark"
        ? "bg-ink shadow-[0_1px_0_rgb(238_240_236/0.08)]"
        : "bg-mist/95 shadow-[0_1px_0_rgb(28_43_47/0.1)] backdrop-blur-sm";

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
        {/* A soft shade behind the header while it floats over a film, so the links stay readable. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-night/50 to-transparent transition-opacity duration-500 ${
            tone === "film" ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="relative mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-6 px-5 md:h-[84px] md:px-10">
          <Link href="/" aria-label="Prathamesh Valley Resorts, home" className="shrink-0">
            <Logo variant="mark" alt="" sizes="(min-width: 768px) 128px, 104px" preload className="w-[104px] md:w-[128px]" />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
            {nav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative py-2 text-[0.92rem] font-medium transition-opacity duration-300 ${
                    active ? "opacity-100" : "opacity-80 hover:opacity-100"
                  }`}
                >
                  {item.label}
                  <span
                    aria-hidden
                    className={`absolute -bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-strawberry transition-transform duration-500 ease-out ${
                      active ? "scale-100" : "scale-0"
                    }`}
                  />
                </Link>
              );
            })}
            <OurResortsMenu />
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={contact.phone.href}
              className="hidden text-[0.92rem] font-medium tabular-nums opacity-80 transition-opacity hover:opacity-100 xl:block"
            >
              {contact.phone.display}
            </a>
            <Link
              href="/stays#book"
              className={`btn min-h-10 px-4 py-2 text-[0.86rem] sm:min-h-11 sm:px-5 ${light ? "btn-mist" : "btn-laterite"} xl:ml-5`}
            >
              <span className="sm:hidden">Book</span>
              <span className="hidden sm:inline">Book now</span>
            </Link>
            <button
              type="button"
              onClick={openMenu}
              className="flex min-h-11 items-center gap-3 pl-3 text-[0.92rem] font-medium lg:hidden"
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
        className="menu-sheet m-0 h-dvh max-h-none w-full max-w-none bg-ink p-0 text-mist backdrop:bg-transparent"
        onClick={(event) => {
          const link = event.target instanceof Element ? event.target.closest("a") : null;
          if (!link) return;
          const hash = link.getAttribute("href");
          closeMenu();
          // In-page links: scroll once smooth scrolling has resumed, so the jump is not swallowed.
          if (hash?.startsWith("#")) {
            event.preventDefault();
            requestAnimationFrame(() => {
              if (lenis) lenis.scrollTo(hash, { offset: 0 });
              else document.querySelector(hash)?.scrollIntoView();
            });
          }
        }}
      >
        <div className="relative flex h-full flex-col overflow-hidden">
          {/* A view of the resort across the top. Added only once the menu opens, so the closed menu downloads nothing. */}
          <div aria-hidden className="absolute inset-x-0 top-0 h-[42%]">
            {menuOpen && <Image src={photos.aerialTerraces} alt="" fill sizes="100vw" className="object-cover opacity-55" />}
            <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/30 to-ink" />
          </div>

          <div className="relative flex h-[72px] items-center justify-between px-5">
            <Logo variant="mark" alt="Prathamesh Valley Resorts" sizes="104px" className="w-[104px]" />
            <button type="button" onClick={closeMenu} className="min-h-11 px-1 text-[0.92rem] font-medium">
              Close
            </button>
          </div>

          <nav aria-label="Menu" className="relative mt-auto flex flex-col px-5">
            {[{ label: "Home", href: "/" as const }, ...nav, { label: "Policies", href: "/policies" as const }].map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className="menu-item flex items-center justify-between border-t border-mist/12 py-3.5"
                style={{ "--i": i } as React.CSSProperties}
              >
                <span className="display text-[2rem] leading-none">{item.label}</span>
                <span aria-hidden className="text-[1.3rem] text-haze">
                  →
                </span>
              </Link>
            ))}
          </nav>
          <div className="relative px-5 pt-7">
            <p className="label text-haze">Our other resorts</p>
            <ul className="mt-3 grid gap-2.5">
              {otherProperties("PV").map((property) => (
                <li key={property.code}>
                  <a href={property.url} className="flex items-baseline justify-between gap-4">
                    <span className="text-[1.02rem]">{property.name}</span>
                    <span className="shrink-0 text-[0.85rem] text-haze">{property.place}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative flex flex-col gap-4 px-5 pb-8 pt-7">
            <Link href="/stays#book" className="btn btn-laterite">
              Book a stay
            </Link>
            <a href={contact.phone.href} className="text-center text-[0.95rem] text-haze">
              Call or WhatsApp {contact.phone.display}
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}

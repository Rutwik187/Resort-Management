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
import { Roll } from "./roll";

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
 * text) or data-tone="dark" (the header turns forest green to match).
 */
function readTone(): Tone {
  const line = 36;
  for (const el of document.querySelectorAll<HTMLElement>("[data-tone]")) {
    const box = el.getBoundingClientRect();
    if (box.top <= line && box.bottom > line) return el.dataset.tone as Tone;
  }
  return window.scrollY > 24 ? "light" : "top";
}

const menuPhotos = {
  "/": photos.valley,
  "/stays": photos.glassHouseExterior,
  "/day-packages": photos.poolPalms,
  "/experiences": photos.ropesHills,
  "/celebrations": photos.weddingMandapWhite,
};

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [preview, setPreview] = useState<keyof typeof menuPhotos>("/");
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Set when the menu closes because the booking drawer is opening, which then keeps the page still.
  const handingOff = useRef(false);
  const lenis = useLenis();
  const tone = useSyncExternalStore(subscribe, readTone, () => "top" as Tone);

  const openMenu = () => {
    const section = nav.find((item) => pathname.startsWith(item.href))?.href ?? "/";
    setPreview(section);
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
        ? "bg-forest shadow-[0_1px_0_rgb(242_239_231/0.08)]"
        : "bg-paper shadow-[0_1px_0_rgb(17_38_29/0.08)]";

  return (
    <>
      <a href="#main" className="btn btn-forest fixed left-4 top-4 z-[90] -translate-y-24 focus-visible:translate-y-0">
        Skip to content
      </a>
      <header
        style={{ viewTransitionName: "site-header" }}
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,color] duration-500 ease-out ${bar} ${
          light ? "text-paper" : "text-forest"
        }`}
      >
        {/* A soft shade behind the header while it floats over a film, so the links stay readable. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-night/45 to-transparent transition-opacity duration-500 ${
            tone === "film" ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="relative mx-auto flex h-[72px] max-w-[1680px] items-center justify-between gap-6 px-5 md:h-20 md:px-10">
          <Link href="/" aria-label="Prathamesh Resorts, home" className="shrink-0">
            <Logo variant="mark" alt="" sizes="(min-width: 768px) 132px, 106px" preload className="w-[106px] md:w-[132px]" />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
            {nav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative text-[0.9rem] font-medium tracking-[0.01em] transition-opacity duration-300 ${
                    active ? "opacity-100" : "opacity-80 hover:opacity-100"
                  }`}
                >
                  <Roll>{item.label}</Roll>
                  <span
                    aria-hidden
                    className={`absolute -bottom-1.5 left-0 h-px w-full origin-left bg-current transition-transform duration-500 ease-out ${
                      active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </Link>
              );
            })}
            <OurResortsMenu light={light} />
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={contact.bookingPhone.href}
              className="hidden text-[0.9rem] font-medium tabular-nums opacity-80 transition-opacity hover:opacity-100 xl:block"
            >
              {contact.bookingPhone.display}
            </a>
            <Link
              href="/stays#book"
              className={`btn min-h-10 px-4 py-2 text-[0.85rem] sm:min-h-11 sm:px-5 sm:py-2.5 ${light ? "btn-paper" : "btn-forest"} xl:ml-5`}
            >
              <span className="sm:hidden">Book</span>
              <span className="hidden sm:inline">
                <Roll>Book now</Roll>
              </span>
            </Link>
            <button
              type="button"
              onClick={openMenu}
              className="flex min-h-11 items-center gap-3 rounded-full pl-3 text-[0.9rem] font-medium lg:hidden"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-controls="site-menu"
            >
              Menu
              <span aria-hidden className="flex w-6 flex-col gap-1.5">
                <span className="h-px w-full bg-current" />
                <span className="h-px w-2/3 self-end bg-current" />
              </span>
            </button>
          </div>
        </div>
      </header>

      <dialog
        ref={dialogRef}
        id="site-menu"
        aria-label="Menu"
        className="menu-sheet m-0 h-dvh max-h-none w-full max-w-none bg-forest p-0 text-paper backdrop:bg-transparent"
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
        <div className="relative flex h-full flex-col overflow-hidden px-5 pb-8">
          {/* The photo of whichever page the finger rests on. Added only once the menu opens, so the closed menu downloads nothing. */}
          <div aria-hidden className="absolute inset-0 opacity-30">
            {menuOpen && Object.entries(menuPhotos).map(([href, photo]) => (
              <Image
                key={href}
                src={photo}
                alt=""
                fill
                sizes="100vw"
                className={`object-cover transition-opacity duration-700 ${preview === href ? "opacity-100" : "opacity-0"}`}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/70 to-forest/40" />
          </div>

          <div className="relative flex h-[72px] items-center justify-between">
            <Logo variant="mark" alt="Prathamesh Resorts" sizes="106px" className="w-[106px]" />
            <button type="button" onClick={closeMenu} className="min-h-11 px-1 text-[0.9rem] font-medium">
              Close
            </button>
          </div>
          <nav aria-label="Menu" className="relative mt-8 flex flex-col">
            {[{ label: "Home", href: "/" as const }, ...nav].map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                onPointerEnter={() => setPreview(item.href)}
                onFocus={() => setPreview(item.href)}
                className="menu-item flex items-baseline gap-4 border-b border-paper/10 py-3"
                style={{ "--i": i } as React.CSSProperties}
              >
                <span className="label text-sage">0{i + 1}</span>
                <span className="display text-[2.4rem] leading-none">{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="relative mt-8">
            <p className="label text-sage">Our other resorts</p>
            <ul className="mt-3 grid gap-3">
              {otherProperties("KS").map((property) => (
                <li key={property.code}>
                  <a href={property.url} className="flex items-baseline justify-between gap-4">
                    <span className="text-[1.05rem]">{property.name}</span>
                    <span className="text-[0.85rem] text-sage">{property.place}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mt-auto flex flex-col gap-4">
            <Link href="/stays#book" className="btn btn-sun">
              Book a stay
            </Link>
            <Link href="/day-packages" className="btn btn-ghost text-paper">
              Book a day package
            </Link>
            <a href={contact.bookingPhone.href} className="text-center text-[0.95rem] text-sage">
              Call {contact.bookingPhone.display}
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}

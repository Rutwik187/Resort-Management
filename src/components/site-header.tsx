"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLenis } from "lenis/react";
import { contact, nav } from "@/content/resort";
import { Wordmark } from "./wordmark";

function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lenis = useLenis();

  // The header always stays in place. It only changes once: from transparent
  // at the very top of the page to solid as soon as the page moves. Hiding it
  // on scroll made it flicker, because smooth scrolling slows in tiny steps.
  const solid = useSyncExternalStore(subscribeToScroll, () => window.scrollY > 24, () => false);

  const openMenu = () => {
    dialogRef.current?.showModal();
    setMenuOpen(true);
    lenis?.stop();
  };
  const closeMenu = () => {
    dialogRef.current?.close();
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      setMenuOpen(false);
      lenis?.start();
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [lenis]);

  // Close the menu after a route change.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  return (
    <>
      <a
        href="#main"
        className="btn btn-moss fixed left-4 top-4 z-[60] -translate-y-24 focus-visible:translate-y-0"
      >
        Skip to content
      </a>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300 ease-out ${
          solid ? "bg-mist shadow-[0_1px_0_rgb(20_43_36/0.1)]" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-18 max-w-[1600px] items-center justify-between gap-6 px-5 md:h-20 md:px-10">
          <Link href="/" aria-label="Prathamesh Resorts, home" className="shrink-0">
            <Wordmark />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-9 md:flex">
            {nav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`text-[0.95rem] transition-colors duration-200 hover:text-moss ${
                    active ? "text-moss" : "text-fern"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <a href="#enquire" className="btn btn-moss min-h-11 px-5 py-2 text-[0.9rem]">
              Plan your stay
            </a>
          </nav>

          <button
            type="button"
            onClick={openMenu}
            className="flex min-h-11 items-center gap-3 rounded-full px-1 text-[0.95rem] md:hidden"
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
      </header>

      <dialog
        ref={dialogRef}
        id="site-menu"
        aria-label="Menu"
        className="menu-sheet m-0 h-dvh max-h-none w-full max-w-none bg-moss p-0 text-mist backdrop:bg-transparent"
        onClick={(event) => {
          const link = event.target instanceof Element ? event.target.closest("a") : null;
          if (!link) return;
          const hash = link.getAttribute("href");
          closeMenu();
          // In-page links: scroll once smooth scrolling has resumed, so the jump is not swallowed.
          if (hash?.startsWith("#")) {
            event.preventDefault();
            requestAnimationFrame(() => {
              if (lenis) lenis.scrollTo(hash, { offset: -24 });
              else document.querySelector(hash)?.scrollIntoView();
            });
          }
        }}
      >
        <div className="flex h-full flex-col px-5 pb-8">
          <div className="flex h-18 items-center justify-between">
            <Wordmark tone="light" />
            <button type="button" onClick={closeMenu} className="min-h-11 px-1 text-[0.95rem]">
              Close
            </button>
          </div>
          <nav aria-label="Menu" className="mt-10 flex flex-col gap-2">
            {[{ label: "Home", href: "/" }, ...nav].map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className="menu-item display py-1 text-[2.9rem] leading-tight"
                style={{ "--i": i } as React.CSSProperties}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-4">
            <a href="#enquire" className="btn btn-zari">
              Plan your stay
            </a>
            <a href={contact.bookingPhone.href} className="text-center text-sage">
              Call {contact.bookingPhone.display}
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}

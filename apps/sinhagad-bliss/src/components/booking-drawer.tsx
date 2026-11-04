"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { ContactList } from "./contact-list";
import { EnquiryForm, isPurpose, type Purpose } from "./enquiry-form";

export const OPEN_BOOKING = "booking:open";

/** What the page is about decides which plan the form starts on. */
function pagePurpose(pathname: string): Purpose {
  if (pathname.startsWith("/celebrations")) return "wedding";
  return "stay";
}

/**
 * "Plan your stay" opens this panel from the side, so planning never means
 * losing your place on the page. It takes over every link to #enquire;
 * a link can choose the plan with data-purpose="villa" and so on.
 */
export function BookingDrawer() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const lenis = useLenis();
  const [purpose, setPurpose] = useState<Purpose>("stay");
  // A new key each time the drawer opens, so the form starts fresh on the right plan.
  const [opening, setOpening] = useState(0);

  useEffect(() => {
    const open = (chosen?: string) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      setPurpose(isPurpose(chosen) ? chosen : pagePurpose(pathname));
      setOpening((n) => n + 1);
      if (!dialog.open) dialog.showModal();
      lenis?.stop();
      document.documentElement.style.overflow = "hidden";
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href="#enquire"]') : null;
      if (!link) return;
      // Stop here, before smooth scrolling or the menu can also react to the click.
      event.preventDefault();
      event.stopPropagation();
      window.dispatchEvent(new CustomEvent(OPEN_BOOKING, { detail: link.dataset.purpose }));
    };
    const onOpen = (event: Event) => open((event as CustomEvent<string | undefined>).detail);
    window.addEventListener("click", onClick, true);
    window.addEventListener(OPEN_BOOKING, onOpen);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener(OPEN_BOOKING, onOpen);
    };
  }, [lenis, pathname]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      document.documentElement.style.overflow = "";
      lenis?.start();
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [lenis]);

  // Leaving the page closes the drawer.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="booking-title"
      className="drawer fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-ink"
      onClick={(event) => {
        // A click on the dimmed page beside the panel closes it.
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div
        data-lenis-prevent
        className="drawer-panel ml-auto flex h-full w-full flex-col overflow-y-auto overscroll-contain bg-mist sm:max-w-[580px]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink/10 bg-mist px-6 py-4 md:px-10">
          <p className="kicker text-slate">Sinhagad Bliss</p>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="kicker flex min-h-11 items-center gap-3"
          >
            Close
            <span aria-hidden className="relative block size-3.5">
              <span className="absolute inset-x-0 top-1/2 h-px rotate-45 bg-current" />
              <span className="absolute inset-x-0 top-1/2 h-px -rotate-45 bg-current" />
            </span>
          </button>
        </div>

        <div className="px-6 pb-12 pt-10 md:px-10">
          <h2 id="booking-title" className="text-[clamp(2.6rem,5vw,3.8rem)]">
            Plan a quiet <em>stay</em>
          </h2>
          <p className="mt-5 max-w-sm text-[0.98rem] text-slate">
            The form opens WhatsApp with your details filled in. The team replies with availability and rates.
          </p>
          <EnquiryForm key={opening} defaultPurpose={purpose} compact className="mt-10" />
          <ContactList className="mt-12 border-t border-ink/15 pt-8" />
        </div>
      </div>
    </dialog>
  );
}

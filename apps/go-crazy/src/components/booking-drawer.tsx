"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isPassId, type DayPass } from "@/content/resort";
import { ContactList } from "./contact-list";
import { EnquiryForm, isPurpose, type Purpose } from "./enquiry-form";

export const OPEN_BOOKING = "booking:open";

type Opening = { purpose?: string; pass?: string };

/** What the page is about decides which plan the form starts on. */
function pagePurpose(pathname: string): Purpose {
  if (pathname.startsWith("/stays")) return "stay";
  if (pathname.startsWith("/schools")) return "school";
  if (pathname.startsWith("/celebrations")) return "wedding";
  return "day";
}

/**
 * "Plan a day" opens this panel from the side, so planning never means
 * losing your place on the page. It takes over every link to #enquire. A link
 * can choose the plan with data-purpose="stay", and a day pass with data-pass="evening".
 */
export function BookingDrawer() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const [purpose, setPurpose] = useState<Purpose>("day");
  const [pass, setPass] = useState<DayPass["id"]>("morning");
  // A new key each time the drawer opens, so the form starts fresh on the right plan.
  const [opening, setOpening] = useState(0);

  useEffect(() => {
    const open = ({ purpose: chosen, pass: chosenPass }: Opening) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      setPurpose(isPurpose(chosen) ? chosen : isPassId(chosenPass) ? "day" : pagePurpose(pathname));
      setPass(isPassId(chosenPass) ? chosenPass : "morning");
      setOpening((n) => n + 1);
      if (!dialog.open) dialog.showModal();
      document.documentElement.style.overflow = "hidden";
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href="#enquire"]') : null;
      if (!link) return;
      // Stop here, before the menu can also react to the click.
      event.preventDefault();
      event.stopPropagation();
      window.dispatchEvent(new CustomEvent<Opening>(OPEN_BOOKING, { detail: { purpose: link.dataset.purpose, pass: link.dataset.pass } }));
    };
    const onOpen = (event: Event) => open((event as CustomEvent<Opening>).detail ?? {});
    window.addEventListener("click", onClick, true);
    window.addEventListener(OPEN_BOOKING, onOpen);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener(OPEN_BOOKING, onOpen);
    };
  }, [pathname]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      document.documentElement.style.overflow = "";
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

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
      <div className="drawer-panel ml-auto flex h-full w-full flex-col overflow-y-auto overscroll-contain bg-chalk sm:max-w-[580px]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-ink bg-lime px-6 py-3.5 md:px-9">
          <p className="label marker">Plan your visit</p>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="tap flex min-h-11 items-center gap-3 text-[0.95rem] font-bold uppercase tracking-[0.06em]"
          >
            Close
            <span aria-hidden className="relative block size-3.5">
              <span className="absolute inset-x-0 top-1/2 h-[2px] rotate-45 bg-current" />
              <span className="absolute inset-x-0 top-1/2 h-[2px] -rotate-45 bg-current" />
            </span>
          </button>
        </div>

        <div className="px-6 pb-12 pt-9 md:px-9">
          <h2 id="booking-title" className="text-[clamp(3rem,7vw,4.4rem)]">
            When are you coming?
          </h2>
          <p className="mt-4 max-w-sm text-[0.98rem] text-stone">
            The form opens WhatsApp with your details filled in, and our team replies with availability.
          </p>
          <EnquiryForm key={opening} defaultPurpose={purpose} defaultPass={pass} compact className="mt-9" />
          <ContactList className="mt-12 border-t-2 border-ink pt-8" />
        </div>
      </div>
    </dialog>
  );
}

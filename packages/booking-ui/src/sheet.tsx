"use client";

import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";

// Sheets can open over one another, such as dates over the phone tray. The page stays still until the last one closes.
let openSheets = 0;
const holdPage = () => {
  openSheets += 1;
  document.documentElement.style.overflow = "hidden";
};
const releasePage = () => {
  openSheets = Math.max(0, openSheets - 1);
  if (openSheets === 0) document.documentElement.style.overflow = "";
};

type SheetProps = {
  open: boolean;
  onClose: () => void;
  /** Names the sheet for screen readers. */
  label: string;
  children: ReactNode;
  /** Stays in view at the foot of the sheet, for the main button. */
  footer?: ReactNode;
  /** "center" also sits in the middle of larger screens. Without it, the sheet is for phones only. */
  center?: boolean;
  className?: string;
};

/**
 * A panel over the page. On phones it rises from the foot of the screen; with
 * `center` it sits in the middle of larger screens. The page behind stays
 * still. Escape, the close button or a tap outside closes it, and focus goes
 * back to the button that opened it.
 */
export function Sheet({ open, onClose, label, children, footer, center = false, className = "" }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const closed = useEffectEvent(onClose);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    if (!dialog.open) dialog.showModal();
    // Start on the sheet's heading, when it marks one, rather than ringing its first button.
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    holdPage();
    return () => {
      releasePage();
      if (dialog.open) dialog.close();
    };
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // A close event can arrive after the sheet has opened again, such as when React remounts it in development. Then it is old news.
    const onDialogClose = () => {
      if (!dialog.open) closed();
    };
    dialog.addEventListener("close", onDialogClose);
    return () => dialog.removeEventListener("close", onDialogClose);
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      data-lenis-prevent
      className={`bk-dialog bg-bk-card p-0 text-bk-ink ${center ? "bk-dialog-center" : ""} ${className}`}
      onClick={(event) => {
        // A tap on the dimmed page outside the panel closes it.
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className="bk-dialog-frame flex flex-col">
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-5 sm:px-6">
          {children}
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close"
            className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full text-[1.5rem] leading-none text-bk-muted transition-colors hover:bg-bk-soft hover:text-bk-ink"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        {footer && <div className="border-t border-bk-line px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">{footer}</div>}
      </div>
    </dialog>
  );
}

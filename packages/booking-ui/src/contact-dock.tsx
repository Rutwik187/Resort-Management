"use client";

import { usePathname } from "next/navigation";

/*
 * The floating WhatsApp and call buttons on every page (WEB-03). The
 * WhatsApp message names the resort and the page the guest is on, so the
 * team knows what they were looking at. On phones the buttons step aside
 * while the booking tray, a notice or the cookie banner is open
 * (booking.css).
 */

type ContactDockProps = {
  resortName: string;
  /** WhatsApp number with the country code and no plus sign, such as 917721965656. */
  whatsapp: string;
  /** A tel: link, such as tel:+919049538888. */
  phoneHref: string;
  phoneDisplay: string;
};

export function ContactDock({ resortName, whatsapp, phoneHref, phoneDisplay }: ContactDockProps) {
  const pathname = usePathname();
  const openWhatsApp = () => {
    const page = document.title.split(" | ")[0] || "your website";
    const text = `Hello ${resortName}, I'm on the "${page}" page (${window.location.origin}${pathname}) and have a question.`;
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  const button = "flex size-13 items-center justify-center rounded-full shadow-[0_14px_30px_-12px_rgb(0_0_0/0.5)] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bk-ink";

  return (
    <div className="bk-contact fixed bottom-4 right-4 z-30 flex flex-col gap-3 sm:bottom-6 sm:right-6">
      <a href={phoneHref} aria-label={`Call ${resortName} on ${phoneDisplay}`} className={`${button} bg-bk-card text-bk-ink`}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
        </svg>
      </a>
      <button type="button" onClick={openWhatsApp} aria-label={`Message ${resortName} on WhatsApp`} className={`${button} bg-[#25d366] text-white`}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-7" fill="currentColor">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2m0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2m4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3" />
        </svg>
      </button>
    </div>
  );
}

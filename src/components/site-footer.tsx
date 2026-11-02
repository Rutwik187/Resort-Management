import Link from "next/link";
import { contact, nav, sisterResorts } from "@/content/resort";

export function SiteFooter() {
  return (
    <footer className="overflow-hidden bg-moss-3 text-mist">
      <div className="mx-auto grid max-w-[1600px] gap-12 px-5 pb-16 pt-20 sm:grid-cols-2 md:px-10 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <p className="display max-w-xs text-[2rem] leading-[1.1]">Come, breathe, relax, enjoy.</p>
          <ul className="mt-8 flex gap-6 text-[0.95rem] text-sage">
            {contact.social.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noreferrer" className="tap transition-colors hover:text-mist">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h2 className="font-sans text-[0.95rem] tracking-normal text-sage">Find us</h2>
          <address className="mt-4 not-italic leading-relaxed">
            {contact.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <a href={contact.mapsUrl} target="_blank" rel="noreferrer" className="link-line mt-4">
            Get directions
          </a>
        </div>

        <div className="lg:col-span-3">
          <h2 className="font-sans text-[0.95rem] tracking-normal text-sage">Talk to us</h2>
          <ul className="mt-4 space-y-3">
            <li>
              <a href={contact.bookingPhone.href} className="tap hover:text-zari">
                {contact.bookingPhone.display}
              </a>
            </li>
            <li>
              <a href={`https://wa.me/${contact.whatsapp.number}`} target="_blank" rel="noreferrer" className="tap hover:text-zari">
                WhatsApp {contact.whatsapp.display}
              </a>
            </li>
            <li>
              <a href={`mailto:${contact.email}`} className="tap hover:text-zari">
                {contact.email}
              </a>
            </li>
          </ul>
          <p className="mt-6 text-[0.9rem] text-sage">
            Check-in {contact.checkIn}
            <br />
            Check-out {contact.checkOut}
          </p>
        </div>

        <div className="lg:col-span-3">
          <h2 className="font-sans text-[0.95rem] tracking-normal text-sage">Our other resorts</h2>
          <ul className="mt-4 space-y-3">
            {sisterResorts.map((r) => (
              <li key={r.href}>
                <a href={r.href} target="_blank" rel="noreferrer" className="group block">
                  <span className="group-hover:text-zari">{r.name}</span>
                  <span className="block text-[0.9rem] text-sage">{r.place}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 border-t border-sage/15 px-5 py-6 text-[0.9375rem] text-sage md:px-10">
        <nav aria-label="Footer" className="flex flex-wrap gap-6">
          <Link href="/" className="tap hover:text-mist">
            Home
          </Link>
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="tap hover:text-mist">
              {item.label}
            </Link>
          ))}
        </nav>
        <p>
          © 2026 Prathamesh Resorts. Opening photo of the Sahyadri by{" "}
          <a
            href="https://unsplash.com/photos/green-trees-on-mountain-during-foggy-day-PTI5yH3A4l8"
            target="_blank"
            rel="noreferrer"
            className="tap underline decoration-sage/40 underline-offset-4 hover:text-mist"
          >
            Satyan Chawla
          </a>
          .
        </p>
      </div>

      <p
        aria-hidden
        className="display pointer-events-none -mb-[0.2em] select-none whitespace-nowrap text-center text-[19.5vw] leading-[0.85] tracking-[-0.03em] text-moss-2"
      >
        Prathamesh
      </p>
    </footer>
  );
}

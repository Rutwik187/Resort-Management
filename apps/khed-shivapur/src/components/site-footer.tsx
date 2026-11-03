import Link from "next/link";
import { otherProperties } from "@repo/sites";
import { contact, nav } from "@/content/resort";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer data-tone="dark" className="overflow-hidden bg-night text-paper">
      <div className="mx-auto grid max-w-[1680px] gap-14 px-5 pb-16 pt-24 sm:grid-cols-2 md:px-10 lg:grid-cols-12">
        <div className="sm:col-span-2 lg:col-span-4">
          <Logo variant="fullOnDark" sizes="260px" className="w-[220px] md:w-[260px]" />
          <p className="display mt-10 max-w-xs text-[2.1rem] leading-[1.05]">
            Come, breathe, relax, <em>enjoy.</em>
          </p>
          <ul className="mt-8 flex gap-6 text-[0.95rem] text-sage">
            {contact.social.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noreferrer" className="tap transition-colors hover:text-paper">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3 lg:col-start-5">
          <h2 className="label font-sans tracking-[0.16em] text-sage">Find us</h2>
          <address className="mt-5 not-italic leading-relaxed">
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
          <h2 className="label font-sans tracking-[0.16em] text-sage">Talk to us</h2>
          <ul className="mt-5 space-y-3">
            <li>
              <a href={contact.bookingPhone.href} className="tap tabular-nums hover:text-sun">
                {contact.bookingPhone.display}
              </a>
            </li>
            <li>
              <a href={`https://wa.me/${contact.whatsapp.number}`} target="_blank" rel="noreferrer" className="tap tabular-nums hover:text-sun">
                WhatsApp {contact.whatsapp.display}
              </a>
            </li>
            <li>
              <a href={`mailto:${contact.email}`} className="tap hover:text-sun">
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

        <div className="lg:col-span-2">
          <h2 className="label font-sans tracking-[0.16em] text-sage">Our other resorts</h2>
          <ul className="mt-5 space-y-4">
            {otherProperties("KS").map((property) => (
              <li key={property.code}>
                <a href={property.url} className="group block">
                  <span className="group-hover:text-sun">{property.name}</span>
                  <span className="block text-[0.9rem] text-sage">{property.place}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-4 border-t border-paper/10 px-5 py-6 text-[0.9rem] text-sage md:px-10">
        <nav aria-label="Footer" className="flex flex-wrap gap-6">
          <Link href="/" className="tap hover:text-paper">
            Home
          </Link>
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="tap hover:text-paper">
              {item.label}
            </Link>
          ))}
          <Link href="/policies" className="tap hover:text-paper">
            Policies
          </Link>
        </nav>
        <p>© 2026 Prathamesh Resorts, Khed Shivapur</p>
      </div>

      <p
        aria-hidden
        className="display pointer-events-none -mb-[0.22em] select-none whitespace-nowrap text-center text-[20.5vw] leading-[0.85] tracking-[-0.045em] text-canopy"
      >
        Prathamesh
      </p>
    </footer>
  );
}

import Link from "next/link";
import { otherProperties } from "@repo/sites";
import { contact, dms, nav } from "@/content/resort";
import { Email } from "./email";
import { Logo } from "./logo";

export function SiteFooter() {
  const { lat, lng } = contact.geo;
  return (
    <footer data-tone="dark" className="bg-night text-mist">
      {/* The chequered paving of the resort's paths, as the last thing on every page. */}
      <div aria-hidden className="checker [--checker-a:var(--color-mist)] [--checker-b:var(--color-night)] [--size:10px]" />

      <div className="mx-auto grid max-w-[1600px] gap-14 px-5 pb-16 pt-20 sm:grid-cols-2 md:px-10 lg:grid-cols-12">
        <div className="sm:col-span-2 lg:col-span-4">
          <Logo variant="full" sizes="240px" className="w-[200px] md:w-[240px]" />
          <p className="display mt-10 max-w-xs text-[1.9rem] leading-[1.1] [--em-color:var(--color-clay)]">
            A hill-station holiday in the <em>Western Ghats.</em>
          </p>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[0.95rem] text-haze">
            {contact.social.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noreferrer" className="tap transition-colors hover:text-mist">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3 lg:col-start-6">
          <h2 className="label font-sans tracking-[0.14em] text-haze">Find us</h2>
          <address className="mt-5 not-italic leading-relaxed">
            {contact.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <a href={contact.mapsUrl} target="_blank" rel="noreferrer" className="arrow-link mt-4">
            Get directions
          </a>
          <p className="mt-5 text-[0.9rem] tabular-nums text-haze">
            {dms(lat)} N, {dms(lng)} E
            <br />
            {contact.elevation} above sea level
          </p>
        </div>

        {/* Four columns, so the email fits at every desktop width. min-w-0 keeps a long line from widening the grid. */}
        <div className="min-w-0 lg:col-span-4">
          <h2 className="label font-sans tracking-[0.14em] text-haze">Talk to us</h2>
          <ul className="mt-5 space-y-3">
            <li>
              <a href={contact.phone.href} className="tap tabular-nums hover:text-clay">
                {contact.phone.display}
              </a>
            </li>
            <li>
              <a href={`https://wa.me/${contact.whatsapp.number}`} target="_blank" rel="noreferrer" className="tap hover:text-clay">
                WhatsApp us
              </a>
            </li>
            <li>
              {/* A long address wraps after the @. Only with very large text does the domain itself break. */}
              <a href={`mailto:${contact.email}`} className="tap [overflow-wrap:anywhere] hover:text-clay">
                <Email address={contact.email} />
              </a>
            </li>
          </ul>
          <p className="mt-6 text-[0.9rem] text-haze">
            Check-in {contact.checkIn}
            <br />
            Check-out {contact.checkOut}
          </p>
        </div>

        <div className="lg:col-span-3">
          <h2 className="label font-sans tracking-[0.14em] text-haze">Our other resorts</h2>
          <ul className="mt-5 space-y-4">
            {otherProperties("PV").map((property) => (
              <li key={property.code}>
                <a href={property.url} className="group block">
                  <span className="group-hover:text-clay">{property.name}</span>
                  <span className="block text-[0.9rem] text-haze">{property.place}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 border-t border-mist/10 px-5 py-6 text-[0.9rem] text-haze md:px-10">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/" className="tap hover:text-mist">
            Home
          </Link>
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="tap hover:text-mist">
              {item.label}
            </Link>
          ))}
          <Link href="/policies" className="tap hover:text-mist">
            Terms, cancellation and privacy
          </Link>
        </nav>
        <p>© 2026 Prathamesh Valley Resorts, Bhilar</p>
      </div>
    </footer>
  );
}

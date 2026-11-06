import Link from "next/link";
import { hasBlog as blogIsLive } from "@repo/sanity";
import { otherProperties } from "@repo/sites";
import { contact, nav } from "@/content/resort";
import { Logo } from "./logo";

export async function SiteFooter() {
  // The blog link shows once Sanity has a live post.
  const hasBlog = await blogIsLive("SB");
  return (
    <footer data-tone="dark" className="overflow-hidden bg-night text-mist">
      {/* The day ends on the horizon: the sun from the logo, half set. */}
      <div aria-hidden className="relative mx-auto h-16 max-w-[1560px] px-5 md:px-10">
        <div className="absolute inset-x-5 bottom-0 h-px bg-mist/12 md:inset-x-10" />
        <div className="absolute bottom-0 left-1/2 h-7 w-16 -translate-x-1/2 overflow-hidden">
          <span className="sun absolute left-1/2 top-1 size-12 -translate-x-1/2 opacity-90" />
        </div>
      </div>

      <div className="mx-auto grid max-w-[1560px] gap-14 px-5 pb-16 pt-20 sm:grid-cols-2 md:px-10 lg:grid-cols-12">
        <div className="sm:col-span-2 lg:col-span-3">
          <Logo variant="fullOnDark" sizes="240px" className="w-[200px] md:w-[240px]" />
          <p className="mt-8 max-w-xs text-haze">
            A quiet resort in the foothills of Sinhagad, with the mountain in view and two kitchens kept apart.
          </p>
          <ul className="mt-7 flex gap-7 text-[0.95rem] text-haze">
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
          <h2 className="kicker font-sans text-haze">Find us</h2>
          <address className="mt-5 not-italic leading-relaxed">
            {contact.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <a href={contact.mapsUrl} target="_blank" rel="noreferrer" className="link-rule mt-4 text-apricot">
            Get directions
          </a>
        </div>

        <div className="lg:col-span-3">
          <h2 className="kicker font-sans text-haze">Talk to us</h2>
          <ul className="mt-5 space-y-3">
            <li>
              <a href={contact.phone.href} className="tap tabular-nums transition-colors hover:text-apricot">
                {contact.phone.display}
              </a>
            </li>
            <li>
              <a
                href={`https://wa.me/${contact.whatsapp.number}`}
                target="_blank"
                rel="noreferrer"
                className="tap tabular-nums transition-colors hover:text-apricot"
              >
                WhatsApp {contact.whatsapp.display}
              </a>
            </li>
            <li>
              <a href={`mailto:${contact.email}`} className="tap transition-colors hover:text-apricot">
                {contact.email}
              </a>
            </li>
          </ul>
          <p className="mt-6 text-[0.92rem] text-haze">
            Weddings{" "}
            <a href={contact.weddingPhone.href} className="tap tabular-nums text-mist transition-colors hover:text-apricot">
              {contact.weddingPhone.display}
            </a>
          </p>
          <p className="mt-4 text-[0.92rem] text-haze">
            Check-in {contact.checkIn}
            <br />
            Check-out {contact.checkOut}
          </p>
        </div>

        <div className="lg:col-span-3">
          <h2 className="kicker font-sans text-haze">The other Prathamesh resorts</h2>
          <ul className="mt-5 space-y-4">
            {otherProperties("SB").map((property) => (
              <li key={property.code}>
                <a href={property.url} className="group block">
                  <span className="transition-colors group-hover:text-apricot">{property.name}</span>
                  <span className="block text-[0.92rem] text-haze">{property.place}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-4 border-t border-mist/10 px-5 py-6 text-[0.92rem] text-haze md:px-10">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-2">
          <Link href="/" className="tap hover:text-mist">
            Home
          </Link>
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="tap hover:text-mist">
              {item.label}
            </Link>
          ))}
          {hasBlog && (
            <Link href="/blog" className="tap hover:text-mist">
              Blog
            </Link>
          )}
          <Link href="/policies" className="tap hover:text-mist">
            Policies
          </Link>
        </nav>
        <p>© 2026 Sinhagad Bliss, Ghera Sinhagad</p>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { contact, dayPasses, formatRupees, nav, sisterResorts } from "@/content/resort";
import { Logo } from "./logo";

const fromPrice = formatRupees(Math.min(...dayPasses.map((p) => p.adult)));

export function SiteFooter() {
  return (
    <footer data-tone="dark" className="bg-pine-deep text-chalk">
      {/* The last thing on every page: a pass that leads straight to planning. */}
      <div className="mx-auto max-w-[1600px] px-4 pt-20 md:px-8 md:pt-28">
        <a
          href="#enquire"
          className="group grid overflow-hidden rounded-[6px] bg-lime text-ink md:grid-cols-[1fr_22rem] md:ticket-v"
        >
          <span className="flex flex-col justify-between gap-10 p-7 md:p-10">
            <span className="label marker">Admit one · any day of the week</span>
            <span className="display block text-[clamp(3.4rem,9vw,8.5rem)] transition-[font-stretch] duration-500 ease-out group-hover:[font-stretch:72%]">
              See you at the gate
            </span>
          </span>
          <span className="flex items-end justify-between gap-6 border-t-2 border-dashed border-ink/40 p-7 md:flex-col md:items-start md:border-l-2 md:border-t-0 md:p-10">
            <span>
              <span className="label block">Day passes from</span>
              <span className="figure mt-2 block text-[3.4rem]">{fromPrice}</span>
              <span className="text-[0.9rem]">a person, plus GST</span>
            </span>
            <span className="btn btn-ink">
              Plan a day <span aria-hidden className="arrow">→</span>
            </span>
          </span>
        </a>
      </div>

      <div className="mx-auto grid max-w-[1600px] gap-12 px-4 pb-14 pt-20 sm:grid-cols-2 md:px-8 lg:grid-cols-12">
        <div className="sm:col-span-2 lg:col-span-3">
          <Logo variant="fullOnDark" sizes="280px" className="w-[230px] md:w-[280px]" />
          <p className="mt-8 max-w-xs text-mist">
            An adventure park and resort at the foot of Sinhagad fort, within an hour of anywhere in Pune.
          </p>
        </div>

        <div className="lg:col-span-3">
          <h2 className="label text-mist [font-stretch:100%]">Find us</h2>
          <address className="mt-4 not-italic leading-relaxed">
            {contact.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <a href={contact.mapsUrl} target="_blank" rel="noreferrer" className="link-line mt-3">
            Get directions
          </a>
        </div>

        <div className="lg:col-span-3">
          <h2 className="label text-mist [font-stretch:100%]">Talk to us</h2>
          <ul className="mt-4 space-y-2.5">
            <li>
              <a href={contact.phone.href} className="tap tabular-nums hover:text-lime">
                {contact.phone.display}
              </a>
            </li>
            <li>
              <a href={`https://wa.me/${contact.whatsapp.number}`} target="_blank" rel="noreferrer" className="tap tabular-nums hover:text-lime">
                WhatsApp {contact.whatsapp.display}
              </a>
            </li>
            <li>
              <a href={`mailto:${contact.email}`} className="tap hover:text-lime">
                {contact.email}
              </a>
            </li>
          </ul>
          <p className="mt-5 text-[0.9rem] text-mist">
            Stays: check-in {contact.checkIn}, check-out {contact.checkOut}
          </p>
        </div>

        <div className="lg:col-span-3">
          <h2 className="label text-mist [font-stretch:100%]">Our other resorts</h2>
          <ul className="mt-4 space-y-3.5">
            {sisterResorts.map((r) => (
              <li key={r.href}>
                <a href={r.href} target="_blank" rel="noreferrer" className="group block">
                  <span className="font-semibold group-hover:text-lime">{r.name}</span>
                  <span className="block text-[0.9rem] text-mist">{r.place}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 border-t border-chalk/15 px-4 py-6 text-[0.92rem] text-mist md:px-8">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/" className="tap hover:text-chalk">
            Home
          </Link>
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="tap hover:text-chalk">
              {item.label}
            </Link>
          ))}
          <Link href="/policies" className="tap hover:text-chalk">
            Rules and policies
          </Link>
        </nav>
        <p>© 2026 Prathamesh Go Crazy Adventure Park & Resort</p>
      </div>
    </footer>
  );
}

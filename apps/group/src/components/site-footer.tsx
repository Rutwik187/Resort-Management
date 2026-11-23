import Link from "next/link";
import { properties } from "@repo/sites";

/** The group's footer: each resort with its own site, and the group's pages. */
export function SiteFooter() {
  return (
    <footer className="mt-24 bg-forest text-white/85">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.2fr_2fr] md:px-8">
        <div>
          <p className="display text-[1.8rem] text-white">Prathamesh Group</p>
          <p className="mt-3 max-w-sm text-white/70">Four resorts in the Sahyadri: by the river at Khed Shivapur, at the foot of Sinhagad, and in the hills of Mahabaleshwar.</p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          <ul className="grid gap-3">
            {properties.map((p) => (
              <li key={p.code}>
                <a href={p.url} className="font-medium text-white hover:underline">
                  {p.name}
                </a>
                <span className="block text-[0.9rem] text-white/60">{p.place}</span>
              </li>
            ))}
          </ul>
          <ul className="grid content-start gap-2 text-[0.95rem]">
            {[
              ["/resorts", "Our resorts"],
              ["/offers", "Offers"],
              ["/weddings", "Weddings and events"],
              ["/corporate", "Corporate"],
              ["/blog", "Blog"],
              ["/contact", "Contact"],
              ["/policies", "Policies"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="hover:underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-5 text-center text-[0.85rem] text-white/55">© 2026 Prathamesh Group. Each resort is its own company; its bookings, payments and invoices are in its name.</p>
    </footer>
  );
}

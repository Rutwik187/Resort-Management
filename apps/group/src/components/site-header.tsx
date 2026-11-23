import Link from "next/link";

const nav = [
  { href: "/resorts", label: "Our resorts" },
  { href: "/search", label: "Find a stay" },
  { href: "/offers", label: "Offers" },
  { href: "/weddings", label: "Weddings" },
  { href: "/corporate", label: "Corporate" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

/** The group's header: its name, the menu, and Book now, which opens the search. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-stone/90 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-white">
        Skip to the page
      </a>
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-6 px-4 md:px-8">
        <Link href="/" className="display text-[1.35rem] leading-none text-forest">
          Prathamesh <span className="text-clay">Group</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-6 text-[0.95rem] lg:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-ink/80 transition-colors hover:text-forest">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/search" className="inline-flex min-h-11 items-center rounded-full bg-forest px-5 text-[0.95rem] font-medium text-white transition-colors hover:bg-forest-soft">
          Book now
        </Link>
      </div>
      <nav aria-label="Main, small screens" className="flex gap-5 overflow-x-auto border-t border-ink/10 px-4 py-2 text-[0.9rem] lg:hidden">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className="shrink-0 py-1 text-ink/80">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

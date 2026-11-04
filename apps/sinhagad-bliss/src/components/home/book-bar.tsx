import Link from "next/link";
import { SearchBar } from "@repo/booking-ui";

/** Straight after the opening scene: dates and guests, then on to the rooms and their prices. */
export function BookBar() {
  return (
    <section aria-labelledby="book-bar-title" className="relative bg-mist">
      <div className="mx-auto max-w-[1560px] px-5 pt-12 md:px-10 md:pt-16">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <h2 id="book-bar-title" className="kicker text-slate">
            Check availability
          </h2>
          <p className="text-[0.95rem] text-slate">
            Planning a wedding?{" "}
            <Link href="/celebrations" className="text-ink underline underline-offset-4">
              See weddings and events
            </Link>
          </p>
        </div>
        <SearchBar action="/stays" submitLabel="See rooms and prices" className="mt-4" />
      </div>
    </section>
  );
}

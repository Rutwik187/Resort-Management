import Link from "next/link";
import { SearchBar } from "@repo/booking-ui";

/** Straight after the opening film: dates and guests, then on to the rooms and their prices. */
export function BookBar() {
  return (
    <section aria-labelledby="book-bar-title" className="relative bg-paper">
      <div className="mx-auto max-w-[1680px] px-5 pt-10 md:px-10 md:pt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <h2 id="book-bar-title" className="label font-sans text-fern">
            Check availability
          </h2>
          <p className="text-[0.95rem] text-fern">
            Here for the day?{" "}
            <Link href="/day-packages" className="link-line text-forest">
              See day packages
            </Link>
          </p>
        </div>
        <SearchBar action="/stays" submitLabel="See rooms and prices" className="mt-4" />
      </div>
    </section>
  );
}

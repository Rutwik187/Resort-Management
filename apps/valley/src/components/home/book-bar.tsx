import Link from "next/link";
import { SearchBar } from "@repo/booking-ui";

/** Straight after the opening film: dates and guests, then on to the cottages and their prices. */
export function BookBar() {
  return (
    <section aria-labelledby="book-bar-title" className="relative bg-mist">
      <div className="mx-auto max-w-[1600px] px-5 pt-12 md:px-10 md:pt-16">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <h2 id="book-bar-title" className="label flex items-center gap-2.5 text-moss">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-strawberry" />
            Check availability
          </h2>
          <p className="text-[0.95rem] text-moss">
            Every meal included?{" "}
            <Link href="/stays#packages" className="text-ink underline underline-offset-4">
              See the packages
            </Link>
          </p>
        </div>
        <SearchBar action="/stays" submitLabel="See cottages and prices" className="mt-4" />
      </div>
    </section>
  );
}

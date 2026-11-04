import Link from "next/link";
import { packages } from "@/content/resort";
import { InView, Words } from "../in-view";
import { PackageCard } from "../package-card";
import { SectionLabel } from "../section-label";

/** The three meal-inclusive packages, as three postcards on the table. */
export function Packages() {
  return (
    <section aria-labelledby="packages-title" className="overflow-hidden bg-cloud">
      <div className="mx-auto max-w-[1600px] px-5 py-24 md:px-10 md:py-36">
        <InView className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <SectionLabel className="fade text-moss">Packages</SectionLabel>
            <h2 id="packages-title" className="mt-8 text-[clamp(2.8rem,6vw,6.2rem)]">
              <Words text="Every *meal* included" />
            </h2>
          </div>
          <div className="fade lg:col-span-4 lg:col-start-9" style={{ "--i": 2 } as React.CSSProperties}>
            <p className="text-moss">
              Leave the planning to us. Each package includes the meals, every activity and amenity, and a stay with a
              television and hot water. Children under three stay free.
            </p>
            <Link href="/stays#packages" className="arrow-link mt-5">
              Package details
            </Link>
          </div>
        </InView>

        <InView amount={0.1} className="mt-16 grid gap-8 md:mt-24 lg:grid-cols-3 lg:gap-8">
          {packages.map((pkg, i) => (
            <PackageCard
              key={pkg.slug}
              pkg={pkg}
              className="fade"
              style={{ "--i": i } as React.CSSProperties}
            />
          ))}
        </InView>
      </div>
    </section>
  );
}

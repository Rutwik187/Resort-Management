import type { StayPackage } from "@/content/resort";
import { Money } from "./money";
import { Postmark, Stamp } from "./postcard";

/**
 * A package written on a postcard: what it includes on the message side,
 * the main price on the stamp, and the postmark saying who it is for.
 */
export function PackageCard({ pkg, className = "", style }: { pkg: StayPackage; className?: string; style?: React.CSSProperties }) {
  const [main, ...rest] = pkg.rates;
  return (
    <article
      aria-labelledby={`${pkg.slug}-title`}
      className={`relative flex flex-col bg-mist p-6 shadow-[0_1px_0_rgb(28_43_47/0.06),0_24px_50px_-28px_rgb(28_43_47/0.35)] transition-transform duration-500 ease-out sm:p-8 ${className}`}
      style={style}
    >
      <div className="flex items-start justify-between gap-4">
        <Postmark id={`pkg-${pkg.slug}`} ring="PRATHAMESH VALLEY · BHILAR · " center={pkg.mark.toUpperCase()} className="-ml-1 w-[136px] -rotate-6 text-laterite/70" />
        <Stamp className="w-[104px] shrink-0">
          <span className="label text-[0.62rem] text-moss">{main.label}</span>
          <span className="display mt-1 text-[1.45rem] leading-none text-ink">
            <Money amount={main.amount} />
          </span>
          <span className="mt-1 text-[0.62rem] text-moss">plus GST</span>
        </Stamp>
      </div>

      <h3 id={`${pkg.slug}-title`} className="mt-6 text-[clamp(1.9rem,2.6vw,2.5rem)] leading-tight">
        {pkg.name}
      </h3>
      <p className="mt-3 text-moss">{pkg.line}</p>

      {/* The ruled lines of the address side, holding what is included. */}
      <ul className="mt-6 text-[0.95rem]">
        {pkg.includes.map((item) => (
          <li key={item} className="border-b border-ink/12 py-2.5">
            {item}
          </li>
        ))}
      </ul>

      <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 pt-6 text-[0.9rem]">
        <div className="col-span-2">
          <dt className="sr-only">Guests</dt>
          <dd className="label text-moss">{pkg.guests}</dd>
        </div>
        {rest.map((r) => (
          <div key={r.label}>
            <dt className="text-moss">{r.label}</dt>
            <dd className="tabular-nums">
              <Money amount={r.amount} />
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

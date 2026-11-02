import Link from "next/link";
import { Photo } from "../photo";
import { InView, RiseLines } from "../in-view";

const panels = [
  {
    title: "Destination weddings",
    body: "Haldi on the lawn, the ceremony under the trees and a reception that runs late, with rooms for both families and a wedding team on call.",
    href: "/celebrations#weddings",
    cta: "Plan a wedding",
    photo: "weddingReception" as const,
    alt: "A bride and groom on a white floral stage at an evening reception, sparklers behind them",
    position: "object-[62%_50%]",
  },
  {
    title: "Offsites and celebrations",
    body: "Corporate offsites, birthdays, family ceremonies and reunions, with an air-conditioned banquet hall and in-house catering.",
    href: "/celebrations#events",
    cta: "Plan an event",
    photo: "banquetFloral" as const,
    alt: "A sunflower and white-flower arch set up for a celebration in the banquet hall",
    position: "object-center",
  },
];

export function Celebrations() {
  return (
    <section aria-labelledby="celebrations-title" className="bg-mist">
      <div className="mx-auto max-w-[1600px] px-5 py-24 md:px-10 md:py-40">
        <InView>
          <h2 id="celebrations-title" className="max-w-4xl text-[clamp(2.8rem,6vw,6.4rem)]">
            <RiseLines lines={["For the days", "you will retell"]} />
          </h2>
        </InView>
        <div className="mt-16 grid gap-16 md:mt-24 md:grid-cols-2 md:gap-10">
          {panels.map((panel, i) => (
            <InView key={panel.title} amount={0.1} className={i === 1 ? "md:mt-40" : ""}>
              <Link href={panel.href} className="zoom-on-hover group block">
                <div className="unveil">
                  <Photo
                    name={panel.photo}
                    alt={panel.alt}
                    sizes="(min-width: 768px) 46vw, 100vw"
                    className="aspect-[4/5]"
                    imgClassName={panel.position}
                  />
                </div>
                <h3 className="fade mt-8 text-[clamp(2rem,3.2vw,3.2rem)]">{panel.title}</h3>
                <p className="fade mt-4 max-w-md text-fern">{panel.body}</p>
                <span className="fade link-line mt-6">{panel.cta}</span>
              </Link>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}

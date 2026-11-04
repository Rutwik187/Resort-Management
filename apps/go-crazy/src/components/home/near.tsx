import { contact } from "@/content/resort";
import { InView, SnapLines } from "../in-view";
import { Milestones } from "../milestones";
import { Photo } from "../photo";

export function Near() {
  return (
    <section data-tone="dark" aria-labelledby="near-title" className="bg-pine text-chalk">
      <div className="mx-auto grid max-w-[1600px] gap-14 px-4 py-20 md:px-8 md:py-28 lg:grid-cols-12 lg:gap-10">
        <InView className="lg:col-span-5">
          <p className="up label marker marker-lime">Find us</p>
          <h2 id="near-title" className="mt-6 text-[clamp(3.8rem,10vw,9.5rem)]">
            <SnapLines lines={["Sinhagad,", "2 km"]} />
          </h2>
          <p className="up mt-7 max-w-md text-mist" style={{ "--i": 2 } as React.CSSProperties}>
            The park sits at Donje, at the foot of Sinhagad fort, close to the Khadakwasla and Panshet dams. These are
            the distances the park gives from its gate.
          </p>
          <address className="up mt-8 border-t border-chalk/25 pt-6 not-italic leading-relaxed" style={{ "--i": 3 } as React.CSSProperties}>
            {contact.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <div className="up mt-8" style={{ "--i": 4 } as React.CSSProperties}>
            <a href={contact.mapsUrl} target="_blank" rel="noreferrer" className="btn btn-lime">
              Get directions <span aria-hidden className="arrow">→</span>
            </a>
          </div>
          <div className="wipe mt-12 hidden lg:block" style={{ "--i": 2 } as React.CSSProperties}>
            <Photo name="gate" alt="The park's arched gate, with the drive running in under the trees" sizes="38vw" className="aspect-[3/2] rounded-[6px]" />
          </div>
        </InView>

        <InView amount={0.1} className="lg:col-span-6 lg:col-start-7">
          <Milestones />
        </InView>
      </div>
    </section>
  );
}

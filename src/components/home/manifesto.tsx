import { InView } from "../in-view";
import { ParallaxPhoto } from "../parallax-photo";

const lead = "A quiet green valley at the foot of the Sahyadri, close to Pune.";
const detail =
  "Glass houses by the river, tents under the trees and stone cottages on the lawn. Two kitchens, one pure veg and one non-veg. More than eighty ways to spend a day, and nothing at all that asks you to hurry.";

/** The opening statement, set beside a quiet photograph. Each word rises into place once. */
export function Manifesto() {
  const words = lead.split(" ");
  return (
    <section aria-label="About the resort" className="bg-mist">
      <InView
        amount={0.2}
        className="mx-auto grid max-w-[1600px] items-center gap-14 px-5 py-28 md:px-10 md:py-40 lg:grid-cols-12 lg:gap-10"
      >
        <div className="lg:col-span-7">
          <p className="display max-w-[20ch] text-[clamp(2.1rem,4vw,3.75rem)] leading-[1.18]">
            {words.map((word, i) => (
              <span key={i}>
                <span className="rise-word">
                  <span style={{ "--i": i } as React.CSSProperties}>{word}</span>
                </span>{" "}
              </span>
            ))}
          </p>
          <p className="fade mt-8 max-w-[38ch] text-[1.2rem] leading-relaxed text-fern md:text-[1.3rem]" style={{ "--i": 4 } as React.CSSProperties}>
            {detail}
          </p>
        </div>

        <figure className="lg:col-span-4 lg:col-start-9">
          <div className="unveil" style={{ "--i": 3 } as React.CSSProperties}>
            <ParallaxPhoto
              name="chiraForest"
              alt="A laterite stone cottage among ferns and tall trees"
              sizes="(min-width: 1024px) 30vw, 100vw"
              className="aspect-[4/3] lg:aspect-[4/5]"
              depth={8}
            />
          </div>
          <figcaption className="fade mt-4 text-[0.9rem] text-fern" style={{ "--i": 6 } as React.CSSProperties}>
            A Chira cottage, built from the red laterite stone of the Sahyadri.
          </figcaption>
        </figure>
      </InView>
    </section>
  );
}

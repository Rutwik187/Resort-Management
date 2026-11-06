import Link from "next/link";
import { StayPlanner } from "@repo/booking-ui";
import { liveStayGroups } from "@repo/website";
import { desk, stayGroups, stayNotes } from "@/content/booking";
import { amenities, contact, coupleGuests } from "@/content/resort";
import type { PhotoKey } from "@/content/photos";
import { pageMetadata } from "@/content/site";
import { InView } from "@/components/in-view";
import { Lines } from "@/components/lines";
import { Offers } from "@/components/offers";
import { Photo } from "@/components/photo";
import { PageTransition } from "@/components/page-transition";
import { ViewMatrix } from "@/components/view-matrix";

export const metadata = pageMetadata({
  title: "Rooms and villas",
  description:
    "Book a room with a mountain view or a pool, a villa with a private pool, or a group package near Sinhagad, Pune. Choose your dates, add rooms and see the price.",
  path: "/stays",
});

const inside: { name: PhotoKey; alt: string; frame: string }[] = [
  { name: "roomBed", alt: "A double bed with towels folded into swans, under a warm cove light", frame: "aspect-[3/2] sm:col-span-2" },
  { name: "roomMarble", alt: "A bright room with a marble floor, a double bed and a window onto the trees", frame: "aspect-[3/4]" },
  { name: "veranda", alt: "Two chairs on a cottage veranda beside a panelled wall, the garden beyond", frame: "aspect-[3/4]" },
  { name: "roomGarden", alt: "A room whose glass doors open onto a garden", frame: "aspect-[3/2] sm:col-span-2" },
  { name: "balconyHills", alt: "A balcony table set with a snack tray, green hills beyond the railing", frame: "aspect-[3/4]" },
  { name: "bathPetals", alt: "A jacuzzi bath scattered with rose petals, under a window onto the trees", frame: "aspect-[3/4]" },
];

export default async function StaysPage() {
  // Rooms, rates and text from the admin; the site's own content if the database is out of reach.
  const groups = await liveStayGroups("SB", stayGroups);
  return (
    <PageTransition>
      <div className="bg-mist">
        <header className="mx-auto max-w-[1560px] px-5 pt-28 md:px-10 md:pt-40">
          <p className="kicker text-slate">Book a stay</p>
          <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-end">
            <h1 className="text-[clamp(2.8rem,5.4vw,5.4rem)] lg:col-span-6">
              Rooms and <em>villas</em>
            </h1>
            <p className="max-w-xl text-slate lg:col-span-6">
              Rooms that face the hills or open onto a pool, villas for more space, and a package for groups. Add as many rooms
              as your group needs, of any kind.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-[1560px] px-5 pb-24 pt-10 md:px-10 md:pb-32">
          <StayPlanner groups={groups} desk={desk} storageKey="sb" path="/stays" notes={stayNotes} />
          <p className="mt-16 max-w-2xl text-[0.95rem] text-slate">
            Planning a wedding or an event?{" "}
            <Link href="/celebrations" className="text-ink underline underline-offset-4">
              See celebrations
            </Link>
            , or call{" "}
            <a href={contact.phone.href} className="tabular-nums text-ink underline underline-offset-4">
              {contact.phone.display}
            </a>
            .
          </p>
        </div>
      </div>

      <section id="rooms" aria-labelledby="rooms-title" className="scroll-mt-16 bg-stone">
        <InView amount={0.1} className="mx-auto grid max-w-[1560px] gap-14 px-5 pb-24 pt-20 md:px-10 md:pb-32 md:pt-28 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2 id="rooms-title" className="text-[clamp(2.6rem,4.8vw,4.8rem)]">
              <Lines lines={["Four kinds", <>of <em>room</em></>]} />
            </h2>
            <p className="clear mt-8 max-w-sm text-slate" style={{ "--i": 2 } as React.CSSProperties}>
              Choose by two things: the mountain in view or not, a pool or not. Rooms have a private balcony, a television
              and hot water, and sleep {coupleGuests}.
            </p>
          </div>
          <ViewMatrix className="clear lg:col-span-8" />
        </InView>
      </section>

      <section id="inside" aria-labelledby="inside-title" className="scroll-mt-16 bg-stone">
        <InView amount={0.05} className="mx-auto max-w-[1560px] px-5 py-24 md:px-10 md:py-32">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <h2 id="inside-title" className="text-[clamp(2.6rem,4.8vw,4.8rem)] lg:col-span-6">
              <Lines lines={["Inside", <>the <em>rooms</em></>]} />
            </h2>
            <p className="clear max-w-sm text-slate lg:col-span-4 lg:col-start-9" style={{ "--i": 2 } as React.CSSProperties}>
              Calm rooms with warm wood, marble floors and private balconies, some with a bath and some with a view
              of the garden.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
            {inside.map((p, i) => (
              <div key={p.name} className={`surface ${p.frame.includes("col-span-2") ? "col-span-2" : ""}`} style={{ "--i": i } as React.CSSProperties}>
                <Photo name={p.name} alt={p.alt} sizes="(min-width: 640px) 50vw, 100vw" className={p.frame.replace("sm:col-span-2", "")} />
              </div>
            ))}
          </div>
        </InView>
      </section>

      <section id="amenities" aria-labelledby="amenities-title" className="scroll-mt-16 bg-mist">
        <InView amount={0.05} className="mx-auto max-w-[1560px] px-5 py-24 md:px-10 md:py-32">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <h2 id="amenities-title" className="text-[clamp(2.6rem,4.8vw,4.8rem)] lg:col-span-6">
              <Lines lines={["Around", <>the <em>lawns</em></>]} />
            </h2>
            <p className="clear max-w-sm text-slate lg:col-span-4 lg:col-start-9" style={{ "--i": 2 } as React.CSSProperties}>
              Every package includes the activities and amenities. Children have their own play areas, indoors and out.
            </p>
          </div>
          <ul className="mt-14 grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {amenities.map((a, i) => (
              <li key={a.title} className="clear" style={{ "--i": i + 1 } as React.CSSProperties}>
                <div className="surface" style={{ "--i": i } as React.CSSProperties}>
                  <Photo name={a.photo} alt="" sizes="(min-width: 1024px) 24vw, (min-width: 640px) 50vw, 100vw" className="aspect-[4/3]" />
                </div>
                <h3 className="mt-5 text-[1.6rem]">{a.title}</h3>
                <p className="mt-2 text-[0.98rem] text-slate">{a.body}</p>
              </li>
            ))}
          </ul>
        </InView>
      </section>

      <Offers className="border-t border-ink/10" />
    </PageTransition>
  );
}

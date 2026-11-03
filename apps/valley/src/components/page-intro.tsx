import type { ReactNode } from "react";
import type { PhotoKey } from "@/content/photos";
import { InView, Words } from "./in-view";
import { Photo } from "./photo";
import { Stamp } from "./postcard";
import { SectionLabel } from "./section-label";

type PageIntroProps = {
  label: string;
  /** The title. Wrap a word in *asterisks* for the warm italic. */
  title: string;
  children: ReactNode;
  photo: PhotoKey;
  alt: string;
  position?: string;
};

/**
 * Inner-page opening: the title on the left, and on the right a photograph
 * sent like a postcard, with a mist border, a slight tilt and a stamp.
 */
export function PageIntro({ label, title, children, photo, alt, position = "object-center" }: PageIntroProps) {
  return (
    <InView as="header" amount={0.1} className="overflow-hidden bg-mist">
      <div className="mx-auto grid max-w-[1600px] gap-14 px-5 pb-20 pt-32 md:px-10 md:pb-28 md:pt-44 lg:grid-cols-12 lg:items-center lg:gap-10">
        <div className="lg:col-span-7">
          <SectionLabel className="fade text-moss">{label}</SectionLabel>
          <h1 className="mt-8 text-[clamp(3.2rem,7.6vw,8rem)]">
            <Words text={title} />
          </h1>
          <div className="fade mt-10 max-w-xl text-[1.1rem] text-moss" style={{ "--i": 2 } as React.CSSProperties}>
            {children}
          </div>
        </div>
        <div className="fade relative lg:col-span-4 lg:col-start-9" style={{ "--i": 1 } as React.CSSProperties}>
          <div className="rotate-[1.5deg] bg-mist p-2.5 shadow-[0_1px_0_rgb(28_43_47/0.06),0_30px_60px_-28px_rgb(28_43_47/0.45)] sm:p-3">
            <Photo name={photo} alt={alt} preload sizes="(min-width: 1024px) 32vw, 100vw" className="aspect-[4/5]" imgClassName={position} />
          </div>
          <Stamp className="absolute -right-2 -top-6 w-[84px] rotate-6 sm:-right-4 sm:w-[96px]" />
        </div>
      </div>
    </InView>
  );
}

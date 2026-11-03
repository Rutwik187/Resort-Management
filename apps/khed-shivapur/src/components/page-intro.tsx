import type { ReactNode } from "react";
import type { PhotoKey } from "@/content/photos";
import { InView, RiseLines } from "./in-view";
import { Photo } from "./photo";

type PageIntroProps = {
  label: string;
  lines: string[];
  children: ReactNode;
  photo: PhotoKey;
  alt: string;
  position?: string;
};

/** Inner-page opening: the title on the left and an arched photograph on the right. */
export function PageIntro({ label, lines, children, photo, alt, position = "object-center" }: PageIntroProps) {
  return (
    <InView as="header" amount={0.1} className="bg-paper">
      <div className="mx-auto grid max-w-[1680px] gap-12 px-5 pb-20 pt-32 md:px-10 md:pb-28 md:pt-44 lg:grid-cols-12 lg:items-end lg:gap-10">
        <div className="lg:col-span-7">
          <p className="fade label text-fern">{label}</p>
          <h1 className="mt-8 text-[clamp(3.4rem,8.4vw,9rem)]">
            <RiseLines lines={lines} />
          </h1>
          <div className="fade mt-10 max-w-xl text-[1.1rem] text-fern" style={{ "--i": 2 } as React.CSSProperties}>
            {children}
          </div>
        </div>
        <div className="unveil lg:col-span-4 lg:col-start-9" style={{ "--i": 1 } as React.CSSProperties}>
          <Photo
            name={photo}
            alt={alt}
            preload
            sizes="(min-width: 1024px) 30vw, 100vw"
            className="arch aspect-[4/5] sm:aspect-[3/4]"
            imgClassName={position}
          />
        </div>
      </div>
    </InView>
  );
}

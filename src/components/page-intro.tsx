import type { ReactNode } from "react";
import type { PhotoKey } from "@/content/photos";
import { InView, RiseLines } from "./in-view";
import { Photo } from "./photo";

type PageIntroProps = {
  lines: string[];
  children: ReactNode;
  photo: PhotoKey;
  alt: string;
  position?: string;
};

/** Inner-page opening: the title on the left and the arch, from the home page, on the right. */
export function PageIntro({ lines, children, photo, alt, position = "object-center" }: PageIntroProps) {
  return (
    <InView as="header" amount={0.1} className="bg-mist">
      <div className="mx-auto grid max-w-[1600px] gap-12 px-5 pb-20 pt-32 md:px-10 md:pb-28 md:pt-44 lg:grid-cols-12 lg:items-end lg:gap-10">
        <div className="lg:col-span-7">
          <h1 className="text-[clamp(3.2rem,8vw,8.5rem)]">
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
            className="aspect-[4/5] rounded-t-[999px] sm:aspect-[3/4]"
            imgClassName={position}
          />
        </div>
      </div>
    </InView>
  );
}

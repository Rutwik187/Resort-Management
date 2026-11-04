import type { ReactNode } from "react";
import type { PhotoKey } from "@/content/photos";
import { InView } from "./in-view";
import { Lines } from "./lines";
import { Photo } from "./photo";

type PageIntroProps = {
  label: string;
  lines: ReactNode[];
  children: ReactNode;
  photo?: PhotoKey;
  alt?: string;
  caption?: string;
  position?: string;
};

/** Inner-page opening: the title centred, and a wide photograph surfacing below it. */
export function PageIntro({ label, lines, children, photo, alt = "", caption, position = "object-center" }: PageIntroProps) {
  return (
    <InView as="header" amount={0.05} className="bg-mist">
      <div className="mx-auto max-w-[1560px] px-5 pb-16 pt-36 md:px-10 md:pb-24 md:pt-48">
        <div className="mx-auto max-w-4xl text-center">
          <p className="clear kicker text-slate">{label}</p>
          <h1 className="mt-8 text-[clamp(3.2rem,8vw,8.4rem)] leading-[0.98]">
            <Lines lines={lines} start={1} />
          </h1>
          <div className="clear mx-auto mt-10 max-w-xl text-[1.08rem] text-slate" style={{ "--i": lines.length + 1 } as React.CSSProperties}>
            {children}
          </div>
        </div>
        {photo && (
          <figure className="mt-16 md:mt-24">
            <div className="surface" style={{ "--i": 2 } as React.CSSProperties}>
              <Photo name={photo} alt={alt} preload sizes="(min-width: 1560px) 1480px, 100vw" className="aspect-[4/5] sm:aspect-[21/9]" imgClassName={position} />
            </div>
            {caption && <figcaption className="clear mt-4 text-center text-[0.92rem] text-slate">{caption}</figcaption>}
          </figure>
        )}
      </div>
    </InView>
  );
}

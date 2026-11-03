import Link from "next/link";
import { activityGroups, listLine, type ActivityGroup } from "@/content/resort";
import { Photo } from "./photo";

const alts: Partial<Record<ActivityGroup["id"], string>> = {
  water: "Two yellow water slides running down into the main pool",
  heights: "A rider pushing off the high platform on the zip line",
  "little-ones": "Red swings on the lawn of the children's play area, under the trees",
};

/*
 * Groups without a photo yet are drawn instead: an archery target for aim,
 * and a carrom board for indoor games. The frame comes from className.
 */
export function DrawnTile({ id, className = "" }: { id: ActivityGroup["id"]; className?: string }) {
  if (id === "aim") {
    return (
      <div aria-hidden className={`flex items-center justify-center bg-bone ${className}`}>
        <div
          className="aspect-square w-[74%] rounded-full shadow-[0_0_0_2px_var(--color-ink)]"
          style={{
            background:
              "radial-gradient(circle, var(--color-sun) 0 19%, var(--color-ink) 19% 20%, var(--color-brick) 20% 39%, var(--color-ink) 39% 40%, var(--color-pine) 40% 59%, var(--color-ink) 59% 60%, var(--color-ink) 60% 79%, var(--color-chalk) 79% 100%)",
          }}
        />
      </div>
    );
  }
  return (
    <div aria-hidden className={`flex items-center justify-center bg-brick ${className}`}>
      <div className="relative aspect-square w-[74%] bg-[#e8cf9e] shadow-[0_0_0_10px_var(--color-ink)]">
        {["left-1 top-1", "right-1 top-1", "left-1 bottom-1", "right-1 bottom-1"].map((corner) => (
          <span key={corner} className={`absolute size-[13%] rounded-full bg-ink ${corner}`} />
        ))}
        <span className="absolute inset-[18%] border-2 border-ink/70" />
        <span className="absolute left-1/2 top-1/2 size-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink/70" />
        <span className="absolute left-1/2 top-1/2 size-[7%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brick" />
      </div>
    </div>
  );
}

/** The activities as a board of tiles, one per group, each linking to its part of the activities page. */
export function ActivityBoard({ className = "" }: { className?: string }) {
  return (
    <ul className={`grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-5 ${className}`}>
      {activityGroups.map((group, i) => (
        <li key={group.id} className="up" style={{ "--i": i } as React.CSSProperties}>
          <Link href={`/activities#${group.id}`} className="zoom-on-hover group block">
            <div className="relative aspect-[3/4] overflow-hidden rounded-[6px] bg-pine">
              {group.cover ? (
                <Photo name={group.cover} alt={alts[group.id] ?? ""} sizes="(min-width: 1280px) 19vw, (min-width: 768px) 32vw, 50vw" className="h-full" />
              ) : (
                <DrawnTile id={group.id} className="absolute inset-0" />
              )}
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/80 to-transparent" />
              <span className="label absolute left-3 top-3 rounded-[3px] bg-chalk px-2 py-1 text-ink">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="absolute inset-x-3 bottom-3 text-[clamp(2.4rem,4.4vw,3.6rem)] text-chalk transition-[font-stretch] duration-300 ease-out group-hover:[font-stretch:74%]">
                {group.title}
              </h3>
            </div>
            <p className="mt-3 text-[0.93rem] leading-snug text-stone">{listLine(group.items)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

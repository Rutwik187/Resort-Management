import { placeGroups } from "@/content/resort";

/**
 * The places our guide can take you, set like the index of an old
 * guidebook: the place, a dotted leader, and the area it belongs to.
 * Names only: no distances or timings we cannot vouch for.
 */
export function PlaceIndex({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  const rows = placeGroups.flatMap((g) => g.places.map((place) => ({ place, area: g.area })));
  return (
    <ul className={`text-[clamp(1.15rem,1.6vw,1.45rem)] ${className}`} style={style}>
      {rows.map((r) => (
        <li key={r.place} className="flex items-baseline gap-3 py-2">
          <span className="display font-medium">{r.place}</span>
          <span aria-hidden className="mb-[0.3em] h-px min-w-6 flex-1 border-b-2 border-dotted border-current opacity-30" />
          <span className="label shrink-0 text-moss">{r.area}</span>
        </li>
      ))}
    </ul>
  );
}

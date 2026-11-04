import Link from "next/link";
import { passParam } from "@repo/booking-ui";
import { formatRupees, meals, type DayPass } from "@/content/resort";

/* Each pass is printed in one of the logo's colours, like a book of coloured tickets. */
const stubs: Record<DayPass["id"], string> = {
  morning: "bg-sun text-ink",
  afternoon: "bg-lime text-ink",
  evening: "bg-brick text-chalk",
  "full-day": "bg-ink text-lime",
};

/**
 * A day pass as a ticket: the coloured stub carries the name and the hours,
 * and below the perforation the meals are punched in or left blank.
 */
export function PassTicket({ pass, index, className = "", style }: { pass: DayPass; index: number; className?: string; style?: React.CSSProperties }) {
  return (
    <article
      aria-labelledby={`pass-${pass.id}`}
      className={`ticket flex flex-col overflow-hidden rounded-[6px] bg-chalk text-ink shadow-[inset_0_0_0_2px_var(--color-ink)] [--cut:9rem] ${className}`}
      style={style}
    >
      <div className={`flex h-[9rem] shrink-0 flex-col justify-between p-5 ${stubs[pass.id]}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="label">Pass {String(index + 1).padStart(2, "0")}</span>
          <span className="label">Admit one</span>
        </div>
        <div>
          <h3 id={`pass-${pass.id}`} className="text-[2.9rem] leading-[0.82]">
            {pass.name}
          </h3>
          <p className="mt-1.5 text-[0.95rem] font-semibold">{pass.hours}</p>
        </div>
      </div>

      <div aria-hidden className="perforation mx-5 text-ink/45" />

      <div className="flex flex-1 flex-col p-5 pt-4">
        <p className="flex items-baseline gap-2">
          <span className="figure text-[3.3rem]">{formatRupees(pass.adult)}</span>
          <span className="text-[0.9rem] leading-tight text-stone">
            an adult
            <br />
            plus GST
          </span>
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 border-y border-ink/15 py-2.5 text-[0.9rem]">
          <div className="flex justify-between gap-2">
            <dt className="text-stone">Age 5 to 11</dt>
            <dd className="font-semibold tabular-nums">{formatRupees(pass.child5to11)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-stone">Age 3 to 5</dt>
            <dd className="font-semibold tabular-nums">{formatRupees(pass.child3to5)}</dd>
          </div>
        </dl>

        <p className="label mt-4 text-stone">Meals on this pass</p>
        <ul className="mt-2.5 grid gap-1.5 text-[0.93rem]">
          {meals.map((meal) => {
            const included = pass.meals.includes(meal.id);
            return (
              <li key={meal.id} className={`flex items-center gap-3 ${included ? "" : "text-stone/70"}`}>
                <span
                  aria-hidden
                  className={`size-3.5 shrink-0 rounded-full ${included ? "bg-ink" : "border-[1.5px] border-dashed border-current"}`}
                />
                <span className={included ? "font-semibold" : ""}>{meal.label}</span>
                <span className="ml-auto text-[0.82rem] tabular-nums">{included ? meal.time : "Not included"}</span>
              </li>
            );
          })}
        </ul>

        <Link href={`/day-packages?${passParam}=${pass.id}`} className="btn btn-ink mt-6 w-full">
          Book the {pass.name.toLowerCase()} pass <span aria-hidden className="arrow">→</span>
        </Link>
      </div>
    </article>
  );
}

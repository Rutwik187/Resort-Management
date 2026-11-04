import { backRooms, formatRupees, packageById, roomKinds, type RoomKind } from "@/content/resort";

/** A ridge for "mountain view", drawn in one line. */
function Ridge({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 56 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
      <path d="M1 15 L12 6 L18 10 L28 2 L40 12 L46 8 L55 15" />
    </svg>
  );
}

/** A wave for "pool". */
function Wave({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 56 10" className={className} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M1 5 Q 7.5 0 14 5 T 27.5 5 T 41 5 T 55 5" />
    </svg>
  );
}

const columns = [
  { pool: true, label: "With a pool" },
  { pool: false, label: "Without a pool" },
];
const rows = [
  { view: true, label: "Mountain view" },
  { view: false, label: "No mountain view" },
];

function Cell({ kind }: { kind: RoomKind }) {
  const rate = kind.rate ? packageById(kind.rate) : undefined;
  return (
    <td className="relative p-0 align-top">
      <div className="relative flex min-h-[13.5rem] flex-col justify-between gap-6 px-4 pb-5 pt-5 transition-colors duration-500 hover:bg-mist/70 sm:min-h-[15rem] sm:px-7 sm:pb-7 sm:pt-6">
        <div className="flex items-start justify-between gap-3">
          <p>
            <span className="display block text-[clamp(3.6rem,8vw,6.6rem)] leading-[0.85] tabular-nums">{kind.rooms}</span>
            <span className="kicker mt-3 block text-slate">rooms</span>
          </p>
          <span className="flex flex-col items-end gap-2 pt-1">
            {kind.view && <Ridge className="w-11 text-moss sm:w-14" />}
            {kind.pool && <Wave className="w-11 text-lake sm:w-14" />}
          </span>
        </div>
        <div className="text-[0.92rem] leading-snug sm:text-[0.98rem]">
          <span className="sr-only">{kind.name}. </span>
          {rate ? (
            <>
              <span className="block">
                From <span className="tabular-nums">{formatRupees(rate.weekday.couple)}</span> a couple
              </span>
              <span className="block text-slate">
                <span className="tabular-nums">{formatRupees(rate.weekend.couple)}</span> on Fridays and Saturdays
              </span>
            </>
          ) : (
            <span className="block text-slate">Rates on request</span>
          )}
        </div>
      </div>
    </td>
  );
}

/**
 * The four kinds of room, by their two choices: the mountain in view or not,
 * a pool or not. Each cell gives the number of rooms and the rate of the
 * couple package with the same name, where the site publishes one.
 */
export function ViewMatrix({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <table className="w-full table-fixed border-collapse text-left">
        <caption className="sr-only">Rooms by view and pool, with rates per couple plus GST</caption>
        <colgroup>
          <col className="w-9 sm:w-12" />
          <col />
          <col />
        </colgroup>
        <thead>
          <tr>
            <td />
            {columns.map((c) => (
              <th key={c.label} scope="col" className="kicker border-b border-ink/20 px-4 pb-4 font-medium text-slate sm:px-7">
                <span className="flex items-center gap-3">
                  {c.pool ? <Wave className="w-8 text-lake" /> : <span className="h-px w-8 bg-current opacity-40" />}
                  {c.label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-ink/20">
              <th scope="row" className="p-0 align-middle">
                {/* Set sideways, so the row names take no width from the cells. */}
                <span className="kicker mx-auto block rotate-180 py-4 font-medium text-slate [writing-mode:vertical-rl]">{r.label}</span>
              </th>
              {columns.map((c) => {
                const kind = roomKinds.find((k) => k.view === r.view && k.pool === c.pool)!;
                return <Cell key={kind.id} kind={kind} />;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-5 text-[0.92rem] text-slate sm:pl-12">
        And {backRooms.rooms} non-AC rooms at the back, on request. Rates are per couple, plus GST: Monday to Thursday with
        breakfast, Friday and Saturday with breakfast and one main meal.
      </p>
    </div>
  );
}

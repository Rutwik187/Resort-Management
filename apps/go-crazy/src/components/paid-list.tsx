import { formatRupees, paidActivities } from "@/content/resort";

/**
 * The rides paid for at the ride, as a ruled price list. With students on,
 * a second column shows the school-group rate.
 */
export function PaidList({ students = false, tone = "light", className = "" }: { students?: boolean; tone?: "light" | "dark"; className?: string }) {
  const rule = tone === "light" ? "border-ink" : "border-chalk/25";
  const muted = tone === "light" ? "text-stone" : "text-mist";
  return (
    <table className={`w-full border-collapse text-left text-[0.98rem] ${className}`}>
      <caption className="sr-only">Paid activities and their prices{students ? ", with student rates" : ""}</caption>
      <thead>
        <tr className={`border-b-2 ${rule}`}>
          <th scope="col" className={`label py-2.5 font-semibold ${muted}`}>
            Activity
          </th>
          <th scope="col" className={`label py-2.5 text-right font-semibold ${muted}`}>
            Price
          </th>
          {students && (
            <th scope="col" className={`label py-2.5 pl-4 text-right font-semibold ${muted}`}>
              Student
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {paidActivities.map((a) => (
          <tr key={a.name} className={`border-b ${tone === "light" ? "border-ink/15" : "border-chalk/12"}`}>
            <th scope="row" className="py-2.5 pr-4 font-semibold">
              {a.name}
            </th>
            <td className="py-2.5 text-right tabular-nums">{formatRupees(a.price)}</td>
            {students && <td className="py-2.5 pl-4 text-right tabular-nums">{a.student ? formatRupees(a.student) : "–"}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

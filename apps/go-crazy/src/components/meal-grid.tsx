import { dayPasses, meals } from "@/content/resort";

/**
 * Which meals come with which pass, as one punch card: a meal per row, a
 * pass per column, and a punched dot where the pass includes it.
 */
export function MealGrid({ className = "" }: { className?: string }) {
  return (
    // Relative, so the screen-reader text in the cells stays inside the scrolling box and can't widen the page on phones.
    <div className={`relative min-w-0 overflow-x-auto ${className}`}>
      <table className="w-full min-w-[560px] border-collapse text-left">
        <caption className="sr-only">Meals included with each day pass, with their times</caption>
        <thead>
          <tr className="border-b-2 border-ink">
            <th scope="col" className="label py-3 pr-4 font-semibold text-stone">
              Meal
            </th>
            {dayPasses.map((pass) => (
              <th key={pass.id} scope="col" className="px-2 py-3 text-center">
                <span className="display block text-[1.7rem] leading-none">{pass.name}</span>
                <span className="mt-1 block text-[0.78rem] font-normal text-stone">{pass.hours}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {meals.map((meal) => (
            <tr key={meal.id} className="border-b border-ink/15">
              <th scope="row" className="py-4 pr-4 font-normal">
                <span className="block font-bold">{meal.label}</span>
                <span className="text-[0.88rem] tabular-nums text-stone">{meal.time}</span>
              </th>
              {dayPasses.map((pass) => {
                const included = pass.meals.includes(meal.id);
                return (
                  <td key={pass.id} className="px-2 py-4 text-center">
                    <span
                      aria-hidden
                      className={`inline-block size-5 rounded-full align-middle ${included ? "bg-ink shadow-[0_0_0_4px_var(--color-lime)]" : "border-[1.5px] border-dashed border-ink/35"}`}
                    />
                    <span className="sr-only">{included ? "Included" : "Not included"}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

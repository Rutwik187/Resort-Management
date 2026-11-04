import { groundCourse } from "@/content/resort";

/** The general adventure course, numbered, as the park lists it for school groups. */
export function CourseList({ tone = "dark", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  const rule = tone === "dark" ? "border-chalk/20" : "border-ink/15";
  const number = tone === "dark" ? "text-lime" : "text-brick";
  return (
    <ol className={`grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {groundCourse.map((item, i) => (
        <li key={item} className={`up flex items-baseline gap-4 border-b py-3 ${rule}`} style={{ "--i": i % 8 } as React.CSSProperties}>
          <span className={`figure w-8 shrink-0 text-[1.5rem] ${number}`}>{String(i + 1).padStart(2, "0")}</span>
          <span className="text-[0.98rem] leading-snug">{item}</span>
        </li>
      ))}
    </ol>
  );
}

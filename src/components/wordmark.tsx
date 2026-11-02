export function Wordmark({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <span className="flex flex-col leading-none">
      <span className="display text-[1.7rem] tracking-[-0.01em]">Prathamesh</span>
      <span className={`mt-1 text-[0.8125rem] ${tone === "dark" ? "text-fern" : "text-sage"}`}>
        Resorts at Khed Shivapur
      </span>
    </span>
  );
}

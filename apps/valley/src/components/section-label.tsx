/** A section's small heading, marked with one red dot, like the strawberries on the logo. */
export function SectionLabel({ children, className = "", style }: { children: string; className?: string; style?: React.CSSProperties }) {
  return (
    <p className={`label flex items-center gap-2.5 ${className}`} style={style}>
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-strawberry" />
      {children}
    </p>
  );
}

import type { ReactNode } from "react";

/**
 * A heading set line by line, each line coming into focus after the last.
 * Not a client component: pages pass it lines with markup, and an array of
 * elements sent to a client component would need a key on each one.
 */
export function Lines({ lines, start = 0 }: { lines: ReactNode[]; start?: number }) {
  return (
    <>
      {lines.map((line, i) => (
        <span key={i} className="clear block" style={{ "--i": start + i } as React.CSSProperties}>
          {line}
        </span>
      ))}
    </>
  );
}

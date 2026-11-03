"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";

type InViewProps<T extends ElementType> = {
  as?: T;
  /**
   * How far into the screen (0 to 1) the top of the block must travel before
   * it reveals. Measured from the top edge, so very tall blocks still reveal.
   */
  amount?: number;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

/**
 * Marks a block with data-inview="true" the first time it scrolls into view.
 * The reveal itself is plain CSS (.clear, .surface, .draw and .rule-x in
 * globals.css), so it costs nothing after it has played.
 */
export function InView<T extends ElementType = "div">({ as, amount = 0.25, ...rest }: InViewProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || seen) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: `0px 0px -${Math.round(6 + amount * 24)}% 0px` },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [amount, seen]);

  return <Tag ref={ref} data-inview={seen ? "true" : "false"} {...rest} />;
}

/** A heading set line by line, each line coming into focus after the last. */
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
